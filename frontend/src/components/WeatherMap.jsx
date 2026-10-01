import { useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import { getRainColor, getTmaxColor, formatRain, formatTmax, TERRAIN_LABELS } from '../utils'

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Controller component inside MapContainer to auto-invalidate size on resize/tab change
function MapResizer({ isMobile }) {
  const map = useMap()

  useEffect(() => {
    // Invalidate size immediately
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 150)

    // Set up ResizeObserver on container
    const container = map.getContainer()
    const observer = new ResizeObserver(() => {
      map.invalidateSize()
    })
    if (container) observer.observe(container)

    return () => {
      clearTimeout(timer)
      if (container) observer.unobserve(container)
    }
  }, [map, isMobile])

  return null
}

function Legend({ variable }) {
  const map = useMap()
  useEffect(() => {
    const legend = L.control({ position: 'bottomright' })
    legend.onAdd = () => {
      const div = L.DomUtil.create('div')
      div.style.cssText = `
        background: rgba(15,23,42,0.92); border: 1px solid rgba(99,102,241,0.4);
        border-radius: 10px; padding: 10px 14px; font-family: Inter, sans-serif;
        font-size: 11px; color: #e2e8f0; backdrop-filter: blur(8px);
      `
      if (variable === 'rain') {
        div.innerHTML = `
          <div style="font-weight:700;margin-bottom:8px;color:#93c5fd">🌧 Rainfall (mm)</div>
          ${[
            ['#1e3a5f','0'], ['#1d4ed8','5'], ['#2563eb','15'],
            ['#3b82f6','25'], ['#60a5fa','40'], ['#93c5fd','60+']
          ].map(([c, l]) =>
            `<div style="display:flex;align-items:center;gap:6px;margin:3px 0">
              <div style="width:16px;height:10px;border-radius:3px;background:${c}"></div>
              <span>${l}</span>
            </div>`
          ).join('')}
        `
      } else {
        div.innerHTML = `
          <div style="font-weight:700;margin-bottom:8px;color:#fbbf24">🌡 Tmax (°C)</div>
          ${[
            ['#bfdbfe','<28'], ['#fef08a','28'], ['#fde047','30'],
            ['#fb923c','32'], ['#f97316','34'], ['#dc2626','36+']
          ].map(([c, l]) =>
            `<div style="display:flex;align-items:center;gap:6px;margin:3px 0">
              <div style="width:16px;height:10px;border-radius:3px;background:${c}"></div>
              <span>${l}</span>
            </div>`
          ).join('')}
        `
      }
      return div
    }
    legend.addTo(map)
    return () => legend.remove()
  }, [map, variable])
  return null
}

export default function WeatherMap(props) {
  const {
    geojsonData,
    geoJsonData,
    panchayatResults,
    panchayats,
    variable = 'rain',
    selectedVariable,
    mapMode = 'twin',
    viewMode = 'twin',
    onPanchayatClick,
    onSelectPanchayat,
    selectedId,
    selectedPanchayatId,
    lang = 'en',
    isMobile = false,
  } = props

  const gData = geojsonData || geoJsonData
  const pResults = panchayatResults || panchayats
  const currentVar = variable || selectedVariable || 'rain'
  const currentMode = mapMode || viewMode || 'twin'
  const handleSelect = onPanchayatClick || onSelectPanchayat
  const activeId = selectedId || selectedPanchayatId
  const getColor = (feature) => {
    const pid = feature.properties.panchayat_id
    const result = pResults?.find(p => p.panchayat_id === pid)

    if (currentMode === 'block') {
      if (!result) return '#334155'
      const val = currentVar === 'rain' ? result.block_rain_mm : result.block_tmax_c
      return currentVar === 'rain' ? getRainColor(val) : getTmaxColor(val)
    } else {
      if (!result) return '#334155'
      const val = currentVar === 'rain' ? result.rain_mm : result.tmax_c
      return currentVar === 'rain' ? getRainColor(val) : getTmaxColor(val)
    }
  }

  const styleFeature = (feature) => {
    const pid = feature.properties.panchayat_id
    const isSelected = pid === activeId
    const color = getColor(feature)
    return {
      fillColor: color,
      fillOpacity: isSelected ? 0.92 : 0.72,
      color: isSelected ? '#818cf8' : 'rgba(99,102,241,0.3)',
      weight: isSelected ? 2.5 : 0.8,
    }
  }

  const onEachFeature = (feature, layer) => {
    const pid = feature.properties.panchayat_id
    const result = pResults?.find(p => p.panchayat_id === pid)

    layer.on({
      mouseover: (e) => {
        if (!isMobile) {
          e.target.setStyle({
            fillOpacity: 0.95,
            weight: 2,
            color: '#818cf8',
          })
          if (result) {
            const name = lang === 'hi' ? result.name_hi : result.name
            const rainVal = currentMode === 'block' ? result.block_rain_mm : result.rain_mm
            const tmaxVal = currentMode === 'block' ? result.block_tmax_c : result.tmax_c
            const anomaly = result.anomaly?.anomaly_rain || result.anomaly?.anomaly_tmax
            layer.bindTooltip(`
              <div style="font-family:Inter,sans-serif;min-width:160px">
                <div style="font-weight:700;font-size:13px;color:#e2e8f0;margin-bottom:4px">${name}</div>
                <div style="font-size:11px;color:#94a3b8;margin-bottom:6px">LGD: ${result.lgd_code} · ${TERRAIN_LABELS[result.terrain] || result.terrain}</div>
                <div style="display:flex;gap:12px">
                  <div><span style="color:#60a5fa">🌧 ${formatRain(rainVal)}</span></div>
                  <div><span style="color:#fbbf24">🌡 ${formatTmax(tmaxVal)}</span></div>
                </div>
                ${anomaly ? '<div style="color:#f87171;font-size:11px;margin-top:4px">⚠ Anomaly detected</div>' : ''}
                <div style="color:#818cf8;font-size:11px;margin-top:4px">Click for details →</div>
              </div>
            `, { sticky: true, className: 'custom-tooltip' }).openTooltip()
          }
        }
      },
      mouseout: (e) => {
        if (!isMobile) {
          e.target.closeTooltip()
          e.target.setStyle(styleFeature(feature))
        }
      },
      click: () => {
        if (result && handleSelect) handleSelect(result)
      }
    })
  }

  // Memoize key and rendered GeoJSON layer to avoid unneeded re-renders
  const memoizedKey = useMemo(
    () => `${currentVar}-${currentMode}-${activeId}-${isMobile}`,
    [currentVar, currentMode, activeId, isMobile]
  )

  const memoizedGeoJSON = useMemo(() => {
    if (!gData) return null
    return (
      <GeoJSON
        key={memoizedKey}
        data={gData}
        style={styleFeature}
        onEachFeature={onEachFeature}
      />
    )
  }, [gData, memoizedKey, pResults, lang, isMobile])

  return (
    <MapContainer
      center={[23.15, 79.95]}
      zoom={10}
      style={{ height: '100%', width: '100%', borderRadius: isMobile ? '0px' : '16px' }}
      zoomControl={!isMobile}
      touchZoom={true}
      doubleClickZoom={true}
      scrollWheelZoom={!isMobile}
      dragging={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        opacity={0.4}
      />
      <MapResizer isMobile={isMobile} />
      {memoizedGeoJSON}
      <Legend variable={currentVar} />
    </MapContainer>
  )
}
