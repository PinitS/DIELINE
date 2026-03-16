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

func sample(_ x: Int, _ y: Int) {
  let i = (y * width + x) * 4
  let r = pixels[i]
  let g = pixels[i + 1]
  let b = pixels[i + 2]
  let a = pixels[i + 3]
  print("(\(x),\(y)) rgba=\(r),\(g),\(b),\(a)")
}

print("size \(width)x\(height)")
sample(0, 0)
sample(width / 2, height / 2)
sample(width - 1, height - 1)
sample(width - 10, height / 2)
sample(width / 4, height / 2)
sample(10, 10)

