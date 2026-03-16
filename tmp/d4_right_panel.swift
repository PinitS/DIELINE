import AppKit
import Foundation

let path = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
  .appendingPathComponent("src/assets/dieline-images/DIELINE_4.png")

guard let image = NSImage(contentsOf: path) else { fatalError("load fail") }
var rect = NSRect(origin: .zero, size: image.size)
guard let cg = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else { fatalError("cg fail") }

let width = cg.width
let height = cg.height
let colorSpace = CGColorSpaceCreateDeviceRGB()
var pixels = [UInt8](repeating: 255, count: width * height * 4)
let ctx = CGContext(data: &pixels, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4, space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.setFillColor(NSColor.white.cgColor)
ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
ctx.draw(cg, in: CGRect(x: 0, y: 0, width: width, height: height))

func luminance(_ x: Int, _ y: Int) -> Int {
  let i = (y * width + x) * 4
  return (Int(pixels[i]) + Int(pixels[i + 1]) + Int(pixels[i + 2])) / 3
}

let panelMinX = 330
let panelMaxX = width - 1
let panelMinY = 0
let panelMaxY = height - 1

func isLine(_ x: Int, _ y: Int) -> Bool {
  let l = luminance(x, y)
  return l > 60
}

var minX = panelMaxX
var minY = panelMaxY
var maxX = panelMinX
var maxY = panelMinY
var count = 0
for y in panelMinY...panelMaxY {
  for x in panelMinX...panelMaxX where isLine(x, y) {
    minX = min(minX, x)
    minY = min(minY, y)
    maxX = max(maxX, x)
    maxY = max(maxY, y)
    count += 1
  }
}

print("brightCount \(count)")
print("bbox \(minX),\(minY) -> \(maxX),\(maxY)")

let pad = 10
let cropMinX = max(panelMinX, minX - pad)
let cropMinY = max(panelMinY, minY - pad)
let cropMaxX = min(panelMaxX, maxX + pad)
let cropMaxY = min(panelMaxY, maxY + pad)
let cropWidth = max(1, cropMaxX - cropMinX + 1)
let cropHeight = max(1, cropMaxY - cropMinY + 1)
let cols = 120
let rows = 60

for row in 0..<rows {
  let startY = cropMinY + row * cropHeight / rows
  let endY = cropMinY + (row + 1) * cropHeight / rows
  var line = ""
  for col in 0..<cols {
    let startX = cropMinX + col * cropWidth / cols
    let endX = cropMinX + (col + 1) * cropWidth / cols
    var hits = 0
    var total = 0
    for y in startY..<max(startY + 1, endY) {
      for x in startX..<max(startX + 1, endX) {
        total += 1
        if isLine(x, y) { hits += 1 }
      }
    }
    let ratio = Double(hits) / Double(max(total, 1))
    line.append(ratio > 0.24 ? "#" : ratio > 0.06 ? "+" : " ")
  }
  print(line)
}

