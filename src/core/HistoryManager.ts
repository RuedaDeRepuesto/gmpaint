type HistoryListener = (canUndo: boolean, canRedo: boolean) => void;

export class HistoryManager {
  private undoStack: ImageData[] = [];
  private redoStack: ImageData[] = [];
  private maxSteps: number = 50;
  private listeners: Set<HistoryListener> = new Set();

  public pushState(data: ImageData): void {
    const clone = this.cloneImageData(data);
    this.undoStack.push(clone);
    if (this.undoStack.length > this.maxSteps) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.notify();
  }

  public undo(currentData: ImageData): ImageData | null {
    if (!this.canUndo()) return null;
    const previous = this.undoStack.pop()!;
    this.redoStack.push(this.cloneImageData(currentData));
    this.notify();
    return previous;
  }

  public redo(currentData: ImageData): ImageData | null {
    if (!this.canRedo()) return null;
    const next = this.redoStack.pop()!;
    this.undoStack.push(this.cloneImageData(currentData));
    this.notify();
    return next;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  public subscribe(listener: HistoryListener): () => void {
    this.listeners.add(listener);
    listener(this.canUndo(), this.canRedo());
    return () => this.listeners.delete(listener);
  }

  private cloneImageData(source: ImageData): ImageData {
    const copy = new ImageData(source.width, source.height);
    copy.data.set(source.data);
    return copy;
  }

  private notify(): void {
    const canU = this.canUndo();
    const canR = this.canRedo();
    for (const listener of this.listeners) {
      listener(canU, canR);
    }
  }
}
