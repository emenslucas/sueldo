import puppeteer from "puppeteer"
import { NextResponse } from "next/server"

export const config = {
  runtime: "nodejs",
}

// Cache en memoria
let cache: {
  data: any
  timestamp: string
} | null = null

// Función auxiliar para hacer el scraping real
async function scrapeData() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  const page = await browser.newPage()

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
  )

  await page.goto("https://comparatasas.ar/", {
    waitUntil: "networkidle2",
    timeout: 30000,
  })

  const items = await page.evaluate(() => {
    const data: {
      nombre: string
      imagen: string
      tasa: string
      tasaNumero: number
      link: string
    }[] = []

    document
      .querySelectorAll("a[aria-label^='Ver más información sobre']")
      .forEach((el) => {
        const nombre = el.querySelector("h3")?.innerText.trim().split("\n")[0] || ""
        const imagen = el.querySelector("img")?.src || ""
        const tasa = el.querySelector("p.text-indigo-600")?.textContent.trim() || ""
        const link = el.href
        const match = tasa.match(/(\d+(?:,\d+)?)/)
        const tasaNumero = match ? parseFloat(match[1].replace(",", ".")) : 0

        if (
          nombre &&
          tasa &&
          tasaNumero > 0 &&
          !nombre.toLowerCase().includes("cocos daruma")
        ) {
          data.push({ nombre, imagen, tasa, tasaNumero, link })
        }
      })

    return data
  })

  await browser.close()

  if (items.length === 0) {
    throw new Error("No se encontraron datos de inversión.")
  }

  items.sort((a, b) => b.tasaNumero - a.tasaNumero)

  return {
    data: items[0],
    allOptions: items.slice(0, 3),
    timestamp: new Date().toISOString(),
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const forceRefresh = searchParams.get("refresh") === "true"

    if (!forceRefresh && cache) {
      return NextResponse.json({
        success: true,
        ...cache,
        cached: true,
      })
    }

    const scraped = await scrapeData()
    cache = scraped

    return NextResponse.json({
      success: true,
      ...scraped,
      cached: false,
    })
  } catch (error: any) {
    console.error("❌ Error con Puppeteer:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Scraping con Puppeteer falló",
      },
      { status: 500 }
    )
  }
}
