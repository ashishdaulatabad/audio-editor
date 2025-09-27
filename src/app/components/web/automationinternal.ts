import {ScheduledTrackAutomation} from '../../state/trackdetails/trackautomation';

export class AutomationElement extends HTMLElement {
  static observedAttributes = ['automation'];

  constructor(private automation: ScheduledTrackAutomation) {
    super();
  }

  // TODO: create a web component for automation
  connectedCallback() {

  }

  disconnectedCallback() {

  }

  attributeChangedCallback() {

  }
};

customElements.define('c-automation', AutomationElement);
