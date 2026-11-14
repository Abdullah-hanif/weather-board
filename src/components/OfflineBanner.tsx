interface Props {
  online: boolean
  showingCache: boolean
}

export function OfflineBanner({ online, showingCache }: Props) {
  if (online && !showingCache) return null

  return (
    <div className="banner banner--offline" role="status">
      {!online ? (
        <>
          <strong>Offline mode</strong>
          <span>
            {showingCache
              ? 'Showing the last cached city. Reconnect to refresh live data.'
              : 'You’re offline. Search and live weather need a connection.'}
          </span>
        </>
      ) : (
        <>
          <strong>Cached data</strong>
          <span>Live APIs failed — showing the last saved weather for this city.</span>
        </>
      )}
    </div>
  )
}
