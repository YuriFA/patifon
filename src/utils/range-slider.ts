interface RangeSliderOptions {
  min?: number;
  max?: number;
  value?: number;
  vertical?: boolean;
  handle?: boolean;
  buffer?: boolean;
  onmove?: (value: number) => void;
  onchange?: (value: number) => void;
}

const DEFAULTS: Required<
  Pick<RangeSliderOptions, "min" | "max" | "value" | "vertical" | "handle" | "buffer">
> = {
  min: 0,
  max: 1,
  value: 0,
  vertical: false,
  handle: true,
  buffer: false,
};

export default class RangeSlider {
  private fill!: HTMLDivElement;
  private buffer: HTMLDivElement | null = null;
  private draggable = false;

  private readonly min: number;
  private readonly max: number;
  private readonly length: number;
  private readonly vertical: boolean;
  private value: number;
  private ratio: number;

  constructor(
    private readonly node: HTMLElement,
    options: RangeSliderOptions = {},
  ) {
    const merged = { ...DEFAULTS, ...options };
    this.vertical = merged.vertical;
    this.min = merged.min;
    this.max = merged.max;
    this.length = Math.abs(this.min) + Math.abs(this.max);
    this.value = merged.value;
    this.ratio = 0;

    // prevent the native image/ghost drag while sliding
    node.addEventListener("dragstart", (event) => event.preventDefault());

    this.createDOM(merged.handle, merged.buffer);
    this.bindEvents(merged.onmove, merged.onchange);
    this.setValue(this.value);
  }

  setValue(value: number): this {
    this.value = Math.min(this.max, Math.max(this.min, value));
    this.ratio = (this.value - this.min) / this.length;
    this.updateFill();
    return this;
  }

  setValueByRatio(ratio: number): this {
    const validRatio = this.clampRatio(ratio);
    this.ratio = validRatio;
    this.value = this.min + this.ratio * this.length;
    this.updateFill();
    return this;
  }

  setBuffer(ratio: number): this {
    if (this.buffer) {
      const validRatio = this.clampRatio(ratio);
      if (this.vertical) {
        this.buffer.style.height = `${validRatio * 100}%`;
      } else {
        this.buffer.style.width = `${validRatio * 100}%`;
      }
    }
    return this;
  }

  private clampRatio(ratio: number): number {
    return Math.min(1, Math.max(0, ratio));
  }

  private updateFill(): void {
    if (this.vertical) {
      this.fill.style.height = `${this.ratio * 100}%`;
    } else {
      this.fill.style.width = `${this.ratio * 100}%`;
    }
  }

  private updateValue(event: MouseEvent): void {
    const pos = this.node.getBoundingClientRect();
    const ratio = this.vertical
      ? 1 - (event.clientY - pos.top) / this.node.offsetHeight
      : (event.clientX - pos.left) / this.node.offsetWidth;
    this.setValueByRatio(ratio);
  }

  private bindEvents(
    onmove: ((value: number) => void) | undefined,
    onchange: ((value: number) => void) | undefined,
  ): void {
    this.node.addEventListener("mousedown", (event) => {
      if (event.button === 0) {
        this.draggable = true;
        this.updateValue(event);
      }
    });

    document.addEventListener("mousemove", (event) => {
      if (this.draggable) {
        this.updateValue(event);
        onmove?.(this.value);
      }
    });

    document.addEventListener("mouseup", (event) => {
      if (this.draggable) {
        this.draggable = false;
        this.updateValue(event);
        onchange?.(this.value);
      }
    });
  }

  private createPart(parent: HTMLElement, className: string): HTMLDivElement {
    const part = document.createElement("div");
    part.setAttribute("class", className);
    parent.append(part);
    return part;
  }

  private createDOM(handle: boolean, buffer: boolean): void {
    const mainClassName = this.vertical ? "slider-vert" : "slider-horiz";
    this.node.classList.add(mainClassName);
    const track = this.createPart(this.node, `${mainClassName}__track`);
    this.fill = this.createPart(track, `${mainClassName}__filled`);
    if (handle) {
      this.createPart(this.fill, `${mainClassName}__handle`);
    }
    if (buffer) {
      this.buffer = this.createPart(track, `${mainClassName}__buffer`);
    }
  }
}
