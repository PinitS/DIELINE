# StrickerCircleDieline

## Supported attribute

`attribute` supports:

- `size?: number`
  - Circle diameter in millimeters
  - Default: `90`

## Example

`attribute={{ size: 90 }}`

## Default-only example

`attribute={{}}`

## Shared canvas props

- `showDimensions?: boolean`
  - Default: `true`
  - Controls both dimension lines and dimension labels together

## Notes

- Use millimeter values directly
- Overall width and overall height are both derived from `size`
- If `size` is omitted, non-finite, or less than or equal to `0`, the component resolves it to the default value