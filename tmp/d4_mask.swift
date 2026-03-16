import AppKit
import Foundation

let imagePath = "src/assets/dieline-images/DIELINE_4.png"
let cwd = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let url = cwd.appendingPathComponent(imagePath)

guard let image = NSImage(contentsOf: url) else { fatalError("load fail") }
var proposedRect = NSRect(origin: .zero, size: image.size)
guard let cgImage = image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil) else {
  fatalError("cg fail")
}

let width = cgImage.width
let height = cgImage.height
let colorSpace = CGColorSpaceCreateDeviceRGB()
var pixels = [UInt8](repeating: 255, count: width * height * 4)

guard let context = CGContext(
  data: &pixels,
  width: width,
  height: height,
  bitsPerComponent: 8,
  bytesPerRow: width * 4,
  space: colorSpace,
  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else { fatalError("ctx fail") }

context.setFillColor(NSColor.white.cgColor)
context.fill(CGRect(x: 0, y: 0, width: width, height: height))
context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))

func isInk(_ x: Int, _ y: Int) -> Bool {
  let i = (y * width + x) * 4
  let r = Int(pixels[i])
  let g = Int(pixels[i + 1])
  let b = Int(pixels[i + 2])
  let a = Int(pixels[i + 3])
  let luminance = (r + g + b) / 3
  return a > 12 && luminance < 235
}

var minX = width
var minY = height
var maxX = 0
var maxY = 0
var count = 0

for y in 0..<height {
  for x in 0..<width where isInk(x, y) {
    minX = min(minX, x)
    minY = min(minY, y)
    maxX = max(maxX, x)
    maxY = max(maxY, y)
    count += 1
  }
}

print("size \(width)x\(height)")
print("inkCount \(count)")
print("bbox \(minX),\(minY) -> \(maxX),\(maxY)")

let pad = 20
let cropMinX = max(0, minX - pad)
let cropMinY = max(0, minY - pad)
let cropMaxX = min(width - 1, maxX + pad)
let cropMaxY = min(height - 1, maxY + pad)
let cropWidth = cropMaxX - cropMinX + 1
let cropHeight = cropMaxY - cropMinY + 1
let targetCols = 120
let targetRows = 60

for row in 0..<targetRows {
  let startY = cropMinY + row * cropHeight / targetRows
  let endY = cropMinY + (row + 1) * cropHeight / targetRows
  var line = ""
  for col in 0..<targetCols {
    let startX = cropMinX + col * cropWidth / targetCols
    let endX = cropMinX + (col + 1) * cropWidth / targetCols
    var hits = 0
    var total = 0
    if startY >= endY || startX >= endX {
      line.append(" ")
      continue
    }
    for y in startY..<endY {
      for x in startX..<endX {
        total += 1
        if isInk(x, y) { hits += 1 }
      }
    }
    let ratio = Double(hits) / Double(max(total, 1))
    line.append(ratio > 0.18 ? "#" : ratio > 0.04 ? "+" : " ")
  }
  print(line)
}

