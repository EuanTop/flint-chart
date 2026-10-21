import { McpExperienceStories } from '../routes/McpExperience';

/** The MCP page's step-by-step stories, one chart and one board, kept for review. */
export function McpStories() {
  return (
    <section style={{ maxWidth: 880, margin: '0 auto', padding: '12px 0 48px' }}>
      <h1 style={{ margin: '0 0 6px', fontSize: 22, letterSpacing: 0 }}>MCP chat stories</h1>
      <p style={{ margin: '0 0 20px', fontSize: 12, color: '#61676d' }}>
        One chart and one board, built up turn by turn in an agent chat with the real MCP cards.
      </p>
      <McpExperienceStories />
    </section>
  );
}
