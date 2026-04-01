export function SkeletonCard({ height = 'h-20' }) {
  return <div className={`bg-gray-100 rounded-2xl ${height} animate-pulse`} />
}

export function SkeletonRow() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="bg-gray-100 rounded-xl h-10 flex-1" />
      <div className="bg-gray-100 rounded-xl h-10 flex-1" />
      <div className="bg-gray-100 rounded-xl h-10 flex-1" />
    </div>
  )
}

export function SkeletonText({ width = 'w-32' }) {
  return <div className={`bg-gray-100 rounded h-4 ${width} animate-pulse`} />
}
