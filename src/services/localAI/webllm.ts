import { MLCEngine, InitProgressReport, prebuiltAppConfig, CreateMLCEngine } from '@mlc-ai/web-llm';

export type AIStatus = 'offline' | 'loading' | 'ready' | 'error';

export interface LocalAIEngineState {
  status: AIStatus;
  progress: number;
  progressText: string;
  currentModel: string | null;
}

export class LocalAIEngine {
  private engine: MLCEngine | null = null;
  private state: LocalAIEngineState = {
    status: 'offline',
    progress: 0,
    progressText: '',
    currentModel: null
  };
  private onStateChange: (state: LocalAIEngineState) => void = () => {};

  constructor() {}

  setListener(listener: (state: LocalAIEngineState) => void) {
    this.onStateChange = listener;
    this.notify();
  }

  private notify() {
    this.onStateChange({ ...this.state });
  }

  async loadModel(modelId: string) {
    if (this.engine) {
      await this.unloadModel();
    }
    this.state.status = 'loading';
    this.state.currentModel = modelId;
    this.state.progress = 0;
    this.notify();

    try {
      this.engine = await CreateMLCEngine(modelId, {
        initProgressCallback: (report: InitProgressReport) => {
          this.state.progressText = report.text;
          // report.progress is usually 0 to 1
          this.state.progress = report.progress;
          this.notify();
        }
      });
      this.state.status = 'ready';
      this.state.progressText = 'Model loaded successfully.';
      this.notify();
    } catch (err: any) {
      this.state.status = 'error';
      this.state.progressText = `Failed to load: ${err.message}`;
      this.engine = null;
      this.notify();
      throw err;
    }
  }

  async unloadModel() {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
    }
    this.state.status = 'offline';
    this.state.currentModel = null;
    this.state.progress = 0;
    this.state.progressText = '';
    this.notify();
  }

  getEngine(): MLCEngine | null {
    return this.engine;
  }

  getState(): LocalAIEngineState {
    return this.state;
  }

  async getAvailableModels() {
    return prebuiltAppConfig.model_list;
  }
}

export const localAIEngine = new LocalAIEngine();
