"use client"

interface WeatherWidgetProps {
  iconColor: string
}

export function WeatherWidget({ iconColor }: WeatherWidgetProps) {
  return (
    <div className="widget-container">
      <div className="flex items-center gap-2 mb-4">
        <i className={`fas fa-cloud-sun ${iconColor}`}></i>
        <span className="font-semibold">Weather</span>
      </div>
      <div className="text-center flex-grow flex flex-col justify-center">
        <h4 className="text-xl font-bold">Broadmeadows, VIC</h4>
        <div className="flex items-center justify-center gap-4 my-2">
          <i className="fas fa-cloud-sun text-5xl opacity-80"></i>
          <p className="text-4xl font-bold">19°C</p>
        </div>
        <p className="text-lg">Partly Cloudy</p>
      </div>
    </div>
  )
}
