import { useState, useEffect } from 'react'

interface Coords {
  lat: number
  lon: number
  cidade: string
}

export function useUserCoords(): Coords | null {
  const [coords, setCoords] = useState<Coords | null>(null)

  useEffect(() => {
    function buscar() {
      const cidade = localStorage.getItem('userCidade') || ''
      if (!cidade) return

      fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&country_code=BR&language=pt`)
        .then(r => r.json())
        .then(data => {
          const r = data.results?.[0]
          if (r) setCoords({ lat: r.latitude, lon: r.longitude, cidade })
          else setCoords({ lat: -21.7495, lon: -50.3342, cidade })
        })
        .catch(() => {
          setCoords({ lat: -21.7495, lon: -50.3342, cidade })
        })
    }

    buscar()

    // Reage a mudanças no localStorage (ex: novo login em outra aba ou redirect)
    window.addEventListener('storage', buscar)
    return () => window.removeEventListener('storage', buscar)
  }, [])

  return coords
}