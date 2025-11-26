import './Skeleton.css'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
}

export default function Skeleton({
  width = '100%',
  height = '1rem',
  borderRadius = '4px',
  className = ''
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius
      }}
    />
  )
}

// Skeleton group components for common patterns
export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton height="1.5rem" width="60%" />
      <Skeleton height="1rem" width="80%" />
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <Skeleton height="2rem" width="80px" />
        <Skeleton height="2rem" width="80px" />
        <Skeleton height="2rem" width="80px" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-list-item">
          <Skeleton height="1rem" width="100%" />
        </div>
      ))}
    </div>
  )
}