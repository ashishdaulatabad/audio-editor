import {svgxmlns} from '@/app/utils';

export class MarkerElement extends HTMLElement {
  static observedAttributes = [ 
    'width',
    'height',
    'lineDistance',
    'selectedStart',
    'selectedEnd'
  ];
  private w: number = 0;
  private h: number = 0;
  private d: number = 100; // line distance
  private sStart: number = 0;
  private sEnd: number = 0;
  mainSvg: SVGElement | null = null;
  rect: SVGRectElement | null = null;
  def: SVGDefsElement | null = null;
  pattern: SVGPatternElement | null = null;
  maybeSelect: SVGRectElement | null = null;

  set width(w: number) {
    this.w = w;

    if (this.mainSvg) {
      this.mainSvg.setAttribute('width', w.toString());
    }

    if (this.rect) {
      this.rect.setAttribute('width', w.toString());
    }
  }

  get width() {
    return this.w;
  }

  set height(h: number) {
    this.h = h;

    if (this.mainSvg) {
      this.mainSvg.setAttribute('height', h.toString());
    }

    if (this.rect) {
      this.rect.setAttribute('height', h.toString());
      this.modifyPatternDefinition();
    }
  }
  
  get height() {
    return this.h;
  }

  set lineDistance(d: number) {
    this.d = d;

    if (this.def) {
      this.modifyPatternDefinition();
    }
  }
  
  get lineDistance() {
    return this.d;
  }

  set selectedStart(s: number) {
    this.sStart = s;

    if (this.sStart !== this.sEnd && this.rect) {
      this.createSelectedRect();
    } else if (this.maybeSelect) {
      this.mainSvg?.removeChild(this.maybeSelect);
      this.maybeSelect = null;
    }
  }
  
  get selectedStart() {
    return this.sStart;
  }
  
  set selectedEnd(e: number) {
    this.sEnd = e;

    if (this.sStart !== this.sEnd && this.rect) {
      this.createSelectedRect();
    } else if (this.maybeSelect) {
      this.mainSvg?.removeChild(this.maybeSelect);
      this.maybeSelect = null;
    }
  }

  get selectedEnd() {
    return this.sEnd;
  }

  constructor() {
    super();
  }

  private createSelectedRect() {
    if (!this.maybeSelect) {
      this.maybeSelect = document.createElementNS(svgxmlns, 'rect');
    }
    this.maybeSelect.setAttribute('x', this.sStart.toString());
    this.maybeSelect.setAttribute('y', '0');
    this.maybeSelect.setAttribute('width', Math.abs(this.sEnd - this.sStart).toString());
    this.maybeSelect.setAttribute('height', this.h.toString());
    this.maybeSelect.setAttribute('fill', 'rgba(250, 100, 100, 0.3)');

    if (!this.mainSvg?.contains(this.maybeSelect)) {
      this.mainSvg?.appendChild(this.maybeSelect);
    }
  }

  initialize() {
    const svg = document.createElementNS(svgxmlns, 'svg');
    svg.setAttribute('xmlns', svgxmlns);
    svg.setAttribute('width', this.width.toString());
    svg.setAttribute('height', this.height.toString());
    svg.classList.add('track-patterns');
    svg.classList.add('relative');
    const shadow = this.attachShadow({mode: 'open'});

    const markerDefinition = document.createElementNS(svgxmlns, 'defs');
    const pattern = this.createPatternDef();
    markerDefinition.appendChild(pattern);
    svg.appendChild(markerDefinition);

    const rect = document.createElementNS(svgxmlns, 'rect');
    rect.setAttribute('x', '0');
    rect.setAttribute('y', '0');
    rect.setAttribute('width', this.width.toString());
    rect.setAttribute('height', this.height.toString());
    rect.setAttribute('fill', 'url(#repeatingLines)');

    svg.appendChild(rect);

    shadow.appendChild(svg);
    this.mainSvg = svg;
    this.rect = rect;
    this.pattern = pattern;
    this.def = markerDefinition;
  }

  connectedCallback() {
    this.initialize();
  }

  disconnectedCallback() {
    this.removeChild(this.mainSvg!);
  }

  private createPatternDef() {
    const pattern = document.createElementNS(svgxmlns, 'pattern');
    pattern.setAttribute('id', 'repeatingLines');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    pattern.setAttribute('patternContentUnits', 'userSpaceOnUse');
    pattern.setAttribute('x', '0');
    pattern.setAttribute('y', '0');
    pattern.setAttribute('width', this.d.toString());
    pattern.setAttribute('height', this.h.toString());

    pattern.appendChild(MarkerElement.createPath(
      `M0 0 L0 ${this.h}`,
      '#333',
      2
    ));
    pattern.appendChild(MarkerElement.createPath(
      `M${this.d / 4} 0 L${this.d / 4} ${this.h}`,
      '#333',
      1
    ));
    pattern.appendChild(MarkerElement.createPath(
      `M${this.d / 2} 0 L${this.d / 2} ${this.h}`,
      '#333',
      1
    ));
    pattern.appendChild(MarkerElement.createPath(
      `M${3 * this.d / 4} 0 L${3 * (this.d) / 4} ${this.h}`,
      '#333',
      1
    ));
    pattern.appendChild(MarkerElement.createPath(
      `M0 0 L0 ${this.h}`,
      '#333',
      4
    ));
    pattern.appendChild(MarkerElement.createPath(
      `M0 0 L${this.d} 0`,
      '#333',
      1
    ));
    pattern.appendChild(MarkerElement.createPath(
      `M0 ${this.h} L${this.d} ${this.h}`,
      '#344556',
      1
    ));

    return pattern;
  }

  private modifyPatternDefinition() {
    if (!this.pattern) return;

    this.pattern.setAttribute('width', this.d.toString());
    this.pattern.setAttribute('height', this.h.toString());
    this.pattern.children[0].setAttribute('d', `M0 0 L0 ${this.h}`);
    this.pattern.children[1].setAttribute('d', `M${this.d / 4} 0 L${this.d / 4} ${this.h}`);
    this.pattern.children[2].setAttribute('d', `M${this.d / 2} 0 L${this.d / 2} ${this.h}`);
    this.pattern.children[3].setAttribute('d', `M${3 * this.d / 4} 0 L${3 * (this.d) / 4} ${this.h}`);
    this.pattern.children[4].setAttribute('d', `M0 0 L0 ${this.h}`);
    this.pattern.children[5].setAttribute('d', `M0 0 L${this.d} 0`);
    this.pattern.children[6].setAttribute('d', `M0 ${this.h} L${this.d} ${this.h}`);
  }

  private static createPath(data: string, stroke: string, strokeWidth: number) {
    const path = document.createElementNS(svgxmlns, 'path');
    path.setAttribute('d', data);
    path.setAttribute('stroke', stroke);
    path.setAttribute('stroke-width', strokeWidth.toString());
    return path;
  }

  attributeChangedCallback(name: string, oldValue: any, newValue: any) {
    // console.log(name, oldValue, newValue);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'c-marker': MarkerElement;
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'c-marker': React.HTMLAttributes<HTMLElement> & 
          React.RefAttributes<MarkerElement> & {
            width: number;
            height: number;
            lineDistance: number;
            selectedStart?: number;
            selectedEnd?: number;
          };
      }
    }
  }
}
