/** */
export class SingletonStore {
  private static instances: Map<Object, any> = new Map();

  static getInstance<T>(
    classRef: new (..._: any[]) => T, 
    ...defaultArgs: any[]
  ): T {
    if (!this.instances.has(classRef)) {
      this.instances.set(classRef, new classRef(defaultArgs));
    }
    return this.instances.get(classRef);
  }

  static setInstance<T>(classRef: new (...args: any) => T, instance: T): void {
    this.instances.set(classRef, instance);
  }
}

/** Singlestore constant to create a singleton instance */
SingletonStore.setInstance(SingletonStore, new SingletonStore());
