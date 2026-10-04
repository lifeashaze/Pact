import {
  RiCheckboxCircleLine,
  RiFocus3Line,
  RiFootprintLine,
  RiRestaurantLine,
  RiRunLine,
  RiScales3Line,
} from "@remixicon/react"

import type { ModuleId } from "@/lib/modules"

export const MODULE_ICONS: Record<ModuleId, typeof RiRunLine> = {
  workouts: RiRunLine,
  weight: RiScales3Line,
  steps: RiFootprintLine,
  nutrition: RiRestaurantLine,
  habits: RiCheckboxCircleLine,
  focus: RiFocus3Line,
}
