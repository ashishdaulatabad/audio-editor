export enum AnimationState {
  Running,
  Suspended
}

/**
 * @description Batching animation that runs throughout.
 */
class AnimationBatcher {
  handlerStates: {
    [k: symbol]: {
      fn: () => void
      previousTimestamp: number
      allowedFrameTime?: number
      currentMode: AnimationState
    }
  } = {};
  masterHandler: number = 0;

  constructor() {}

  runAnimations() {
    this.masterHandler = this.run();
  }

  /**
   * @description An initial version of batch animation running at once.
   * @returns void
   */
  private run() {
    for (const key of Object.getOwnPropertySymbols(this.handlerStates)) {
      const animationHandle = this.handlerStates[key];
      const currentTimestamp = performance.now();

      if (
        animationHandle.currentMode === AnimationState.Running &&
        (!animationHandle.allowedFrameTime || (animationHandle.allowedFrameTime <= currentTimestamp - animationHandle.previousTimestamp))
      ) {
        animationHandle.fn();

        if (animationHandle.allowedFrameTime) {
          // const timeDiff = (currentTimestamp + animationHandle.previousTimestamp) - animationHandle.allowedFrameTime;
          do {
            animationHandle.previousTimestamp += animationHandle.allowedFrameTime;
          } while (animationHandle.allowedFrameTime <= currentTimestamp - animationHandle.previousTimestamp);
        } else {
          animationHandle.previousTimestamp = currentTimestamp;
        }
      }
    }

    this.masterHandler = requestAnimationFrame(this.run.bind(this));
    return this.masterHandler;
  }

  /**
   * @description Stop animation frame
   */
  stopAnimation() {
    cancelAnimationFrame(this.masterHandler);
  }

  /**
   * @description Adds animation handler to run
   * @param fn function to run on `requestAnimationFrame`
   * @returns unique identifier for this handler
   */
  addAnimationHandler(fn: () => void): symbol {
    const animationSymbolHandler = Symbol();

    this.handlerStates[animationSymbolHandler] = {
      fn,
      previousTimestamp: performance.now(),
      currentMode: AnimationState.Running,
    };

    return animationSymbolHandler;
  }

  /**
   * @description Set animation frame rate.
   * @param handlerSymbol Unique identifier to set refresh rate
   * @param frame frame frequency in Hertz.
   */
  setAnimationFrame(handlerSymbol: symbol, frame: number) {
    if (Object.hasOwn(this.handlerStates, handlerSymbol)) {
      this.handlerStates[handlerSymbol].allowedFrameTime = 1000 / frame;
    }
  }

  /**
   * @description Remove animation.
   * @param handlerSymbol Unique identifier
   */
  removeAnimationHandler(handlerSymbol: symbol) {
    if (Object.hasOwn(this.handlerStates, handlerSymbol)) {
      delete this.handlerStates[handlerSymbol];
    }
  }

  /**
   * @description Suspend running animation, if already suspended, keeps suspended.
   * @param handlerSymbol animation handler.
   */
  suspendAnimation(handlerSymbol: symbol) {
    if (Object.hasOwn(this.handlerStates, handlerSymbol)) {
      this.handlerStates[handlerSymbol].currentMode = AnimationState.Suspended;
    }
  }

  /**
   * @description Resumes running animation, if already suspended, keeps suspended.
   * @param handlerSymbol animation handler.
   */
  resumeAnimation(handlerSymbol: symbol) {
    if (Object.hasOwn(this.handlerStates, handlerSymbol)) {
      this.handlerStates[handlerSymbol].currentMode = AnimationState.Running;
    }
  }
};

export const animationBatcher = new AnimationBatcher();
