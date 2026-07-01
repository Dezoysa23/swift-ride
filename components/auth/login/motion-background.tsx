export default function MotionBackground({ showRoutes = true }: { showRoutes?: boolean }) {
  return (
    <>
      {showRoutes && (
        <div
          aria-hidden
          className="sr-route-drift"
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.5,
            pointerEvents: 'none',
            backgroundImage:
              'repeating-linear-gradient(115deg, transparent 0 46px, rgba(22,58,88,0.18) 46px 48px),' +
              'repeating-linear-gradient(-115deg, transparent 0 60px, rgba(255,201,163,0.05) 60px 61px)',
            backgroundSize: '900px 100%, 900px 100%',
          }}
        />
      )}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(120% 80% at 50% 120%, rgba(0,0,0,0.55) 0%, transparent 60%)',
        }}
      />
    </>
  )
}
