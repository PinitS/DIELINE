# Studio Environment/HDRi Lighting Design

## Date: 2026-03-17

## Overview
ปรับปรุงการจัดไฟใน Becf_10803_folded3d ให้เป็น studio lighting โดยใช้ Environment/HDRi

## Lighting Setup
- **Environment**: `<Environment preset="studio" background={false} />`
- **Ambient Light**: intensity 0.25 (ลดลงให้ environment เด่น)
- **Directional Light**: ลบออก

## Material Adjustment
- roughness: 0.6 (จาก 0.82)
- metalness: 0.1 (จาก 0.02)

## Files to Modify
- `src/components/3D/TuckEndBoxes/Becf_10803_folded3d.tsx`

## Implementation Notes
- Import `<Environment>` จาก @react-three/drei
- ใช้ preset "studio" ที่มีให้ใน drei
- ไม่ต้องโหลดไฟล์ HDRi ภายนอก
