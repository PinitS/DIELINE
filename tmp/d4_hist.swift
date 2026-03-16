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

let panelMinX = 330
var buckets = Array(repeating: 0, count: 26)
for y in stride(from: 0, to: height, by: 2) {
  for x in stride(from: panelMinX, to: width, by: 2) {
    let i = (y * width + x) * 4
    let lum = (Int(pixels[i]) + Int(pixels[i + 1]) + Int(pixels[i + 2])) / 3
    buckets[min(25, lum / 10)] += 1
  }
}
for (index, count) in buckets.enumerated() {
  let start = index * 10
  let end = min(255, start + 9)
  print("\(start)-\(end): \(count)")
}

