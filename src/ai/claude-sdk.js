// ES module entry (loaded by index.html next to the classic scripts). The Anthropic SDK is only downloaded when someone
// uses "Write it with my AI key" (Vite splits the dynamic import into its own chunk), so the studio stays light.
window.loadAnthropicSDK = () => import('@anthropic-ai/sdk').then(m => m.default);
