import { NavBar } from '../components/NavBar';

export function NotFound() {
  return (
    <div class="page detail">
      <NavBar title="Not found" />
      <div class="empty">
        <p>This page doesn’t exist (anymore).</p>
        <p class="muted small">The data may have been updated since the link was made.</p>
      </div>
    </div>
  );
}
