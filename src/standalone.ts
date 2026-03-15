import { PracticeTimerApp } from './app';
import { WebPlatformAdapter } from './platform/web-adapter';
import { createDomRenderer } from './ui/renderer';

const container = document.getElementById('app')!;

const app = new PracticeTimerApp({
  platform: new WebPlatformAdapter(),
  render: createDomRenderer(container),
});

app.init();
