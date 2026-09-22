export default function ExpectedMovePage() {
  return (
    <main
      style={{
        width: '100%',
        minHeight: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <iframe
        src="/expected-move/index.html"
        title="IQTF Expected Move v5.0"
        style={{
          width: '100%',
          height: '100vh',
          minHeight: '100vh',
          border: '0',
          display: 'block',
        }}
      />
    </main>
  )
}
