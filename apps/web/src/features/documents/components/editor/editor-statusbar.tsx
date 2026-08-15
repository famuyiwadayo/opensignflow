export function EditorStatusbar({
  page,
  zoom,
  selected,
}: {
  page: number;
  zoom: number;
  selected: number;
}) {
  return (
    <>
      <span>Page {page}</span>
      <span>Zoom {Math.round(zoom * 100)}%</span>
      <span>
        {selected} field{selected === 1 ? '' : 's'} selected
      </span>
      <span className="text-emerald-300">Saved</span>
    </>
  );
}
