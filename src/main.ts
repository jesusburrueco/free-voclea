import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  app.innerHTML = `
    <main>
      <h1>Voz a MIDI</h1>
      <p>Canta o haz beatbox y conviertelo en notas.</p>
    </main>
  `;
}
