import {
  RiBookOpenLine,
  RiCheckboxCircleLine,
  RiDropLine,
  RiEmotionLine,
  RiFocus3Line,
  RiFootprintLine,
  RiMoonLine,
  RiRestaurantLine,
  RiRunLine,
  RiScales3Line,
  RiSmartphoneLine,
  RiWallet3Line,
} from "@remixicon/react"

import type { ModuleId } from "@/lib/modules"

export const MODULE_ICONS: Record<ModuleId, typeof RiRunLine> = {
  workouts: RiRunLine,
  weight: RiScales3Line,
  steps: RiFootprintLine,
  nutrition: RiRestaurantLine,
  water: RiDropLine,
  sleep: RiMoonLine,
  habits: RiCheckboxCircleLine,
  reading: RiBookOpenLine,
  focus: RiFocus3Line,
  screen: RiSmartphoneLine,
  budget: RiWallet3Line,
  mood: RiEmotionLine,
}
