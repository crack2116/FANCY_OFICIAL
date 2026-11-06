import { parseCatalogCsv, validateCatalogRow } from "../import-client-catalog"

describe("Client Catalog Importer — Unit & Validation Suite", () => {
  it("successfully parses valid CSV rows", () => {
    const csv = `marca,sku,titulo,subtitulo,categoria,especie,etapa_vida,tamano_mascota,precio_pen,stock_inicial,descripcion,requiere_receta
Royal Canin,RC-MINI-01,Royal Canin Mini Adult,Nutricion equilibrada,Alimentos,Perros,Adulto,Pequeno,135.50,20,Alimento premium,NO
Bravecto,BRAV-MED-01,Bravecto Comprimido 10-20kg,Antiparasitario trimestral,Farmacia,Perros,Todos,Mediano,148.00,15,Proteccion 12 semanas,NO`

    const { validRows, rejectedRows } = parseCatalogCsv(csv)

    expect(rejectedRows).toHaveLength(0)
    expect(validRows).toHaveLength(2)

    expect(validRows[0].row.sku).toBe("RC-MINI-01")
    expect(validRows[0].row.precio_pen).toBe("135.50")
    expect(validRows[0].row.stock_inicial).toBe("20")

    expect(validRows[1].row.sku).toBe("BRAV-MED-01")
    expect(validRows[1].row.precio_pen).toBe("148.00")
  })

  it("rejects rows with missing or malformed SKU", () => {
    const seen = new Set<string>()
    const missingSku = validateCatalogRow(
      { sku: "", titulo: "Producto Test", precio_pen: "50", stock_inicial: "10" },
      2,
      seen
    )
    expect(missingSku.valid).toBe(false)
    expect(missingSku.errors).toContain("Missing SKU")

    const malformedSku = validateCatalogRow(
      { sku: "SKU WITH SPACES", titulo: "Producto Test", precio_pen: "50", stock_inicial: "10" },
      3,
      seen
    )
    expect(malformedSku.valid).toBe(false)
    expect(malformedSku.errors[0]).toMatch(/Invalid SKU format/)
  })

  it("detects and rejects duplicate SKUs within the CSV file", () => {
    const csv = `marca,sku,titulo,precio_pen,stock_inicial
BrandA,SKU-DUPLICATE,Producto Uno,50.00,10
BrandB,SKU-DUPLICATE,Producto Dos,60.00,15`

    const { validRows, rejectedRows } = parseCatalogCsv(csv)

    expect(validRows).toHaveLength(1)
    expect(rejectedRows).toHaveLength(1)
    expect(rejectedRows[0].lineNumber).toBe(3)
    expect(rejectedRows[0].reasons[0]).toMatch(/Duplicate SKU "SKU-DUPLICATE"/)
  })

  it("rejects invalid, negative, or zero prices", () => {
    const seen = new Set<string>()
    const zeroPrice = validateCatalogRow(
      { sku: "SKU-ZERO", titulo: "Producto Zero", precio_pen: "0.00", stock_inicial: "10" },
      2,
      seen
    )
    expect(zeroPrice.valid).toBe(false)
    expect(zeroPrice.errors[0]).toMatch(/Invalid price_pen/)

    const negativePrice = validateCatalogRow(
      { sku: "SKU-NEG", titulo: "Producto Neg", precio_pen: "-15.00", stock_inicial: "10" },
      3,
      seen
    )
    expect(negativePrice.valid).toBe(false)

    const nanPrice = validateCatalogRow(
      { sku: "SKU-NAN", titulo: "Producto NaN", precio_pen: "GRATIS", stock_inicial: "10" },
      4,
      seen
    )
    expect(nanPrice.valid).toBe(false)
  })

  it("rejects negative or invalid initial stock", () => {
    const seen = new Set<string>()
    const negStock = validateCatalogRow(
      { sku: "SKU-STOCK", titulo: "Producto Stock", precio_pen: "25.00", stock_inicial: "-5" },
      2,
      seen
    )
    expect(negStock.valid).toBe(false)
    expect(negStock.errors[0]).toMatch(/Invalid stock_inicial/)
  })

  it("is non-destructive: keeps valid rows when bad rows are present", () => {
    const csv = `marca,sku,titulo,precio_pen,stock_inicial
ValidBrand,VALID-01,Valid Product,99.90,10
BadBrand,,Missing SKU,50.00,5
ValidBrand2,VALID-02,Valid Product Two,149.00,12
BadBrand2,BAD-PRICE,Bad Price Product,-10.00,3`

    const { validRows, rejectedRows } = parseCatalogCsv(csv)

    expect(validRows).toHaveLength(2)
    expect(rejectedRows).toHaveLength(2)
    expect(validRows[0].row.sku).toBe("VALID-01")
    expect(validRows[1].row.sku).toBe("VALID-02")
  })
})
