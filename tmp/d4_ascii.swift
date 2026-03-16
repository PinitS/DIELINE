import AppKit
import Foundation

let imagePath = "src/assets/dieline-images/DIELINE_4.png"
let cwd = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let url = cwd.appendingPathComponent(imagePath)

guard let image = NSImage(contentsOf: url) else {
  fatalError("Could not load image at \(url.path)")
}

var proposedRect = NSRect(origin: .zero, size: image.size)
guard let cgImage = image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil) else {
  fatalError("Could not create CGImage")
}

let sourceWidth = cgImage.width
let sourceHeight = cgImage.height
let maxSide = max(sourceWidth, sourceHeight)
let targetMax = 120
let scale = maxSide > targetMax ? Double(targetMax) / Double(maxSide) : 1.0
let width = max(1, Int(Double(sourceWidth) * scale))
let height = max(1, Int(Double(sourceHeight) * scale))

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
) else {
  fatalError("Could not create CGContext")
}

context.interpolationQuality = .high
context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))

let palette = Array("@%#*+=-:. ")
var lines: [String] = []
lines.append("size \(sourceWidth)x\(sourceHeight)")

for y in stride(from: height - 1, through: 0, by: -1) {
  var line = ""
  for x in 0..<width {
    let index = (y * width + x) * 4
    let red = Int(pixels[index])
    let green = Int(pixels[index + 1])
    let blue = Int(pixels[index + 2])
    let luminance = (red + green + blue) / 3
    let paletteIndex = luminance * (palette.count - 1) / 255
    line.append(palette[paletteIndex])
  }
  lines.append(line.trimmingCharacters(in: .whitespaces))
}

let output = lines.joined(separator: "\n")
print(output)
try output.write(to: cwd.appendingPathComponent("tmp/d4_ascii.txt"), atomically: true, encoding: .utf8)

