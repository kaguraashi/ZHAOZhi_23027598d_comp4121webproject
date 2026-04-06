export const dishMeta = {
  'soy-chicken-rice': {
    kitchen: 'HK Home Dishes',
    goals: ['Balanced', 'Office lunch'],
    mealTimes: ['lunch', 'dinner'],
    nutrition: { calories: 640, protein: 38, carbs: 62, fat: 18 },
  },
  'char-siu-rice': {
    kitchen: 'HK Home Dishes',
    goals: ['Comfort', 'Office lunch'],
    mealTimes: ['lunch', 'dinner'],
    nutrition: { calories: 710, protein: 32, carbs: 66, fat: 24 },
  },
  'beef-brisket-noodle': {
    kitchen: 'Central Noodle House',
    goals: ['Comfort', 'Dinner'],
    mealTimes: ['lunch', 'dinner', 'supper'],
    nutrition: { calories: 760, protein: 34, carbs: 72, fat: 26 },
  },
  'wonton-noodle-soup': {
    kitchen: 'Central Noodle House',
    goals: ['Lighter meals', 'Office lunch'],
    mealTimes: ['lunch', 'dinner', 'supper'],
    nutrition: { calories: 520, protein: 26, carbs: 54, fat: 14 },
  },
  'century-egg-congee': {
    kitchen: 'Morning Kitchen',
    goals: ['Lighter meals', 'Breakfast'],
    mealTimes: ['breakfast', 'supper'],
    nutrition: { calories: 390, protein: 22, carbs: 48, fat: 10 },
  },
  'milk-tea': {
    kitchen: 'Morning Kitchen',
    goals: ['Comfort', 'Breakfast'],
    mealTimes: ['breakfast', 'lunch', 'dinner', 'supper'],
    nutrition: { calories: 210, protein: 4, carbs: 24, fat: 10 },
  },
  'build-your-own-bowl': {
    kitchen: 'Fit Bowl Lab',
    goals: ['High protein', 'Lighter meals', 'Office lunch'],
    mealTimes: ['breakfast', 'lunch', 'dinner', 'supper'],
    nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  },
};

export const goalOptions = ['All goals', 'High protein', 'Lighter meals', 'Office lunch', 'Comfort', 'Balanced'];
export const kitchenOptions = ['All kitchens', 'HK Home Dishes', 'Morning Kitchen', 'Central Noodle House', 'Fit Bowl Lab'];

const optionNutrition = {
  rice: { calories: 240, protein: 4, carbs: 53, fat: 1 },
  noodle: { calories: 210, protein: 7, carbs: 42, fat: 3 },
  salad: { calories: 60, protein: 3, carbs: 8, fat: 2 },
  chicken: { calories: 180, protein: 28, carbs: 0, fat: 7 },
  beef: { calories: 220, protein: 24, carbs: 0, fat: 14 },
  tofu: { calories: 140, protein: 13, carbs: 4, fat: 9 },
  'ginger-scallion': { calories: 45, protein: 1, carbs: 3, fat: 3 },
  'black-pepper': { calories: 28, protein: 0, carbs: 2, fat: 2 },
  satay: { calories: 55, protein: 1, carbs: 4, fat: 4 },
  none: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  mild: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  medium: { calories: 1, protein: 0, carbs: 0, fat: 0 },
  hot: { calories: 2, protein: 0, carbs: 0, fat: 0 },
  'fried-egg': { calories: 90, protein: 6, carbs: 1, fat: 7 },
  broccoli: { calories: 30, protein: 3, carbs: 5, fat: 0 },
  corn: { calories: 55, protein: 2, carbs: 12, fat: 1 },
  mushroom: { calories: 20, protein: 2, carbs: 3, fat: 0 },
};

const emptyNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };

function cloneNutrition(nutrition) {
  return {
    calories: nutrition?.calories || 0,
    protein: nutrition?.protein || 0,
    carbs: nutrition?.carbs || 0,
    fat: nutrition?.fat || 0,
  };
}

export function getDishMeta(item) {
  const key = item?.slug || item?.id || '';
  return dishMeta[key] || {
    kitchen: 'HK Home Dishes',
    goals: ['Balanced'],
    mealTimes: ['breakfast', 'lunch', 'dinner', 'supper'],
    nutrition: emptyNutrition,
  };
}

export function matchesGoal(item, selectedGoal) {
  if (!selectedGoal || selectedGoal === 'All goals') return true;
  return getDishMeta(item).goals.includes(selectedGoal);
}

export function matchesKitchen(item, selectedKitchen) {
  if (!selectedKitchen || selectedKitchen === 'All kitchens') return true;
  return getDishMeta(item).kitchen === selectedKitchen;
}

export function matchesMealTime(item, mealTime) {
  if (!mealTime || mealTime === 'all') return true;
  return getDishMeta(item).mealTimes.includes(mealTime);
}

export function getNutritionSummary(item) {
  return cloneNutrition(getDishMeta(item).nutrition);
}

export function formatNutritionLine(nutrition) {
  return `${nutrition.calories} kcal · ${nutrition.protein}g protein`;
}

export function estimateCustomizationNutrition(item, customization) {
  if (!item) return { ...emptyNutrition };

  const key = item?.slug || item?.id || '';
  const base = key === 'build-your-own-bowl'
    ? { ...emptyNutrition }
    : cloneNutrition(getDishMeta(item).nutrition);

  const schema = item.customization_schema || item.customizationSchema || {};

  for (const group of schema.singleChoice || []) {
    const selected = customization?.singleChoice?.[group.key];
    const add = optionNutrition[selected] || null;
    if (add) {
      base.calories += add.calories;
      base.protein += add.protein;
      base.carbs += add.carbs;
      base.fat += add.fat;
    }
  }

  for (const group of schema.multiChoice || []) {
    const selected = customization?.multiChoice?.[group.key] || [];
    for (const code of selected) {
      const add = optionNutrition[code] || null;
      if (add) {
        base.calories += add.calories;
        base.protein += add.protein;
        base.carbs += add.carbs;
        base.fat += add.fat;
      }
    }
  }

  return base;
}

export function applyBuilderPreset(presetKey, currentCustomization) {
  const next = structuredClone(currentCustomization || { singleChoice: {}, multiChoice: {}, notes: '' });
  if (presetKey === 'Office lunch') {
    next.singleChoice.base = 'rice';
    next.singleChoice.protein = 'chicken';
    next.singleChoice.sauce = 'ginger-scallion';
    next.singleChoice.spice = 'none';
    next.multiChoice.sides = ['broccoli'];
  } else if (presetKey === 'High protein') {
    next.singleChoice.base = 'salad';
    next.singleChoice.protein = 'chicken';
    next.singleChoice.sauce = 'black-pepper';
    next.singleChoice.spice = 'mild';
    next.multiChoice.sides = ['fried-egg', 'broccoli'];
  } else if (presetKey === 'Lighter') {
    next.singleChoice.base = 'salad';
    next.singleChoice.protein = 'tofu';
    next.singleChoice.sauce = 'none';
    next.singleChoice.spice = 'none';
    next.multiChoice.sides = ['broccoli'];
  }
  return next;
}
