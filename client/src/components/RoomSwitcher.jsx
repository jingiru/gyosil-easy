import { useEffect, useState } from 'react';

export default function RoomSwitcher({ room, onChange, compact = false }) {
  const [draft, setDraft] = useState(room);

  useEffect(() => setDraft(room), [room]);

  return (
    <form
      className={`room-switcher ${compact ? 'compact' : ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (/^[a-zA-Z0-9_-]{1,40}$/.test(draft.trim())) onChange(draft.trim());
      }}
    >
      <label htmlFor="room-code">교실 코드</label>
      <div>
        <input
          id="room-code"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          pattern="[a-zA-Z0-9_-]{1,40}"
          maxLength={40}
          aria-label="교실 코드"
        />
        <button type="submit">이동</button>
      </div>
    </form>
  );
}
