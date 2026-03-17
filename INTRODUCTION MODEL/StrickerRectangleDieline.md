# StrickerRectangleDieline

## Supported attribute

`attribute` supports:

- `width?: number`
  - Rectangle width in millimeters
  - Default: `120`
- `height?: number`
  - Rectangle height in millimeters
  - Default: `80`

## Example

`attribute={{ width: 120, height: 80 }}`

## Default-only example

`attribute={{}}`

## Shared canvas props

- `showDimensions?: boolean`
  - Default: `true`
  - Controls both dimension lines and dimension labels together

## Notes

- Use millimeter values directly
- Overall width comes from `width`
- Overall height comes from `height`
- If `width` or `height` is omitted, non-finite, or less than or equal to `0`, the component resolves it to the default value