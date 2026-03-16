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

func luminanceAt(x: Int, y: Int) -> Int {
  let i = (y * width + x) * 4
  return (Int(pixels[i]) + Int(pixels[i + 1]) + Int(pixels[i + 2])) / 3
}

print("size \(width)x\(height)")
print("column profiles")
let xBuckets = 24
for bucket in 0..<xBuckets {
  let startX = bucket * width / xBuckets
  let endX = (bucket + 1) * width / xBuckets
  var total = 0
  var count = 0
  for y in stride(from: 0, to: height, by: 4) {
    for x in startX..<endX {
      total += luminanceAt(x: x, y: y)
      count += 1
    }
  }
  let avg = total / max(count, 1)
  print("x[\(startX)-\(endX - 1)] avg=\(avg)")
}

print("row profiles")
let yBuckets = 16
for bucket in 0..<yBuckets {
  let startY = bucket * height / yBuckets
  let endY = (bucket + 1) * height / yBuckets
  var total = 0
  var count = 0
  for y in startY..<endY {
    if y % 4 != 0 { continue }
    for x in stride(from: 0, to: width, by: 4) {
      total += luminanceAt(x: x, y: y)
      count += 1
    }
  }
  let avg = total / max(count, 1)
  print("y[\(startY)-\(endY - 1)] avg=\(avg)")
}

