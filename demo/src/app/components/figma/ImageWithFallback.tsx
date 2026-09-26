import React, { useEffect, useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  fallbackAlt?: string;
}

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false)

  const {
    src,
    alt,
    fallbackSrc,
    fallbackAlt,
    style,
    className,
    loading = 'lazy',
    decoding = 'async',
    onError,
    ...rest
  } = props
  const [currentSrc, setCurrentSrc] = useState(src)

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc)
    setDidError(false)
  }, [src, fallbackSrc])

  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    onError?.(event)

    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
      setDidError(false)
      return
    }

    setDidError(true)
  }

  return didError ? (
    <div
      className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
      style={style}
    >
      <div className="flex items-center justify-center w-full h-full">
        <img
          src={ERROR_IMG_SRC}
          alt="Error loading image"
          loading={loading}
          decoding={decoding}
          {...rest}
          data-original-url={src}
          data-fallback-url={fallbackSrc}
        />
      </div>
    </div>
  ) : (
    <img
      src={currentSrc}
      alt={currentSrc === fallbackSrc ? fallbackAlt || alt : alt}
      loading={loading}
      decoding={decoding}
      className={className}
      style={style}
      {...rest}
      onError={handleError}
    />
  )
}
