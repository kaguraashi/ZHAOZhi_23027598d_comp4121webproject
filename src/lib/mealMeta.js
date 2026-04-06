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

export const seasoningAddons = [
  { code: 'soy-sauce', label: 'Soy sauce', price: 2 },
  { code: 'sea-salt', label: 'Sea salt', price: 1 },
  { code: 'chili-oil', label: 'Chili oil', price: 4 },
  { code: 'black-vinegar', label: 'Black vinegar', price: 2 },
  { code: 'sesame-oil', label: 'Sesame oil', price: 3 },
];

export const builderSchema = {
  singleChoice: [
    {
      key: 'base',
      label: 'Base',
      required: true,
      options: [
        { code: 'rice', label: 'Rice', price: 0 },
        { code: 'noodle', label: 'Noodle', price: 4 },
        { code: 'salad', label: 'Salad', price: 5 },
      ],
    },
    {
      key: 'protein',
      label: 'Protein',
      required: true,
      options: [
        { code: 'chicken', label: 'Chicken', price: 12 },
        { code: 'beef', label: 'Beef', price: 16 },
        { code: 'tofu', label: 'Tofu', price: 8 },
        { code: 'salmon', label: 'Salmon', price: 18 },
      ],
    },
    {
      key: 'sauce',
      label: 'Sauce',
      required: true,
      options: [
        { code: 'ginger-scallion', label: 'Ginger Scallion', price: 0 },
        { code: 'black-pepper', label: 'Black Pepper', price: 0 },
        { code: 'satay', label: 'Satay', price: 2 },
        { code: 'teriyaki', label: 'Teriyaki', price: 2 },
      ],
    },
    {
      key: 'spice',
      label: 'Spice Level',
      required: true,
      options: [
        { code: 'none', label: 'None', price: 0 },
        { code: 'mild', label: 'Mild', price: 0 },
        { code: 'medium', label: 'Medium', price: 0 },
        { code: 'hot', label: 'Hot', price: 0 },
      ],
    },
    {
      key: 'drink',
      label: 'Drink',
      required: true,
      options: [
        { code: 'no-drink', label: 'No drink', price: 0 },
        { code: 'hot-tea', label: 'Hot Tea', price: 6 },
        { code: 'cold-tea', label: 'Cold Tea', price: 8 },
        { code: 'sparkling-water', label: 'Sparkling Water', price: 10 },
        { code: 'protein-soy', label: 'Protein Soy Milk', price: 14 },
      ],
    },
  ],
  multiChoice: [
    {
      key: 'sides',
      label: 'Sides',
      options: [
        { code: 'fried-egg', label: 'Fried Egg', price: 8 },
        { code: 'broccoli', label: 'Broccoli', price: 6 },
        { code: 'corn', label: 'Corn', price: 5 },
        { code: 'mushroom', label: 'Mushroom', price: 7 },
      ],
    },
    {
      key: 'vegetables',
      label: 'Vegetables',
      options: [
        { code: 'bok-choy', label: 'Bok Choy', price: 6 },
        { code: 'edamame', label: 'Edamame', price: 7 },
        { code: 'cucumber', label: 'Cucumber', price: 5 },
        { code: 'tomato', label: 'Tomato', price: 5 },
      ],
    },
    {
      key: 'toppings',
      label: 'Toppings',
      options: [
        { code: 'spring-onion', label: 'Spring Onion', price: 3 },
        { code: 'sesame', label: 'Sesame', price: 2 },
        { code: 'seaweed', label: 'Seaweed', price: 4 },
        { code: 'tofu-skin', label: 'Tofu Skin', price: 6 },
      ],
    },
  ],
};

export function isBuilderItem(item) {
  return (item?.slug || item?.id) === 'build-your-own-bowl';
}


const optionNutrition = {
  // Shared basics
  none: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  mild: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  medium: { calories: 1, protein: 0, carbs: 0, fat: 0 },
  hot: { calories: 2, protein: 0, carbs: 0, fat: 0 },

  // Rice / noodle dishes
  'regular-rice': { calories: 0, protein: 0, carbs: 0, fat: 0 },
  'large-rice': { calories: 90, protein: 2, carbs: 20, fat: 0 },
  'soy-gravy': { calories: 18, protein: 1, carbs: 2, fat: 0 },
  'ginger-scallion': { calories: 45, protein: 1, carbs: 3, fat: 3 },
  'char-siu-sauce': { calories: 35, protein: 0, carbs: 8, fat: 0 },
  'spicy-garlic': { calories: 22, protein: 0, carbs: 2, fat: 1 },
  'fried-egg': { calories: 90, protein: 6, carbs: 1, fat: 7 },
  'bok-choy': { calories: 18, protein: 2, carbs: 3, fat: 0 },
  'tofu-skin': { calories: 70, protein: 6, carbs: 2, fat: 4 },
  'pickled-cucumber': { calories: 12, protein: 0, carbs: 2, fat: 0 },
  broccoli: { calories: 30, protein: 3, carbs: 5, fat: 0 },
  'soft-boiled-egg': { calories: 78, protein: 6, carbs: 1, fat: 5 },

  // Noodles
  'egg-noodle': { calories: 0, protein: 0, carbs: 0, fat: 0 },
  'rice-noodle': { calories: -20, protein: -1, carbs: 4, fat: -1 },
  udon: { calories: 40, protein: 1, carbs: 8, fat: 0 },
  'lai-fun': { calories: 24, protein: 1, carbs: 5, fat: 0 },
  daikon: { calories: 15, protein: 0, carbs: 3, fat: 0 },
  'extra-beef': { calories: 110, protein: 12, carbs: 0, fat: 7 },
  'extra-wonton': { calories: 75, protein: 5, carbs: 6, fat: 3 },
  scallion: { calories: 4, protein: 0, carbs: 1, fat: 0 },

  // Congee
  regular: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  large: { calories: 120, protein: 5, carbs: 18, fat: 2 },
  'fried-dough': { calories: 120, protein: 2, carbs: 14, fat: 6 },
  ginger: { calories: 5, protein: 0, carbs: 1, fat: 0 },
  'extra-pork': { calories: 85, protein: 10, carbs: 0, fat: 5 },

  // Drinks
  cold: { calories: 18, protein: 0, carbs: 4, fat: 0 },
  'less-sugar': { calories: -45, protein: 0, carbs: -11, fat: 0 },
  'no-sugar': { calories: -80, protein: 0, carbs: -20, fat: 0 },

  // Builder core
  rice: { calories: 240, protein: 4, carbs: 53, fat: 1 },
  noodle: { calories: 210, protein: 7, carbs: 42, fat: 3 },
  salad: { calories: 60, protein: 3, carbs: 8, fat: 2 },
  chicken: { calories: 180, protein: 28, carbs: 0, fat: 7 },
  beef: { calories: 220, protein: 24, carbs: 0, fat: 14 },
  tofu: { calories: 140, protein: 13, carbs: 4, fat: 9 },
  salmon: { calories: 190, protein: 22, carbs: 0, fat: 11 },
  'black-pepper': { calories: 28, protein: 0, carbs: 2, fat: 2 },
  satay: { calories: 55, protein: 1, carbs: 4, fat: 4 },
  teriyaki: { calories: 48, protein: 1, carbs: 7, fat: 1 },
  corn: { calories: 55, protein: 2, carbs: 12, fat: 1 },
  mushroom: { calories: 20, protein: 2, carbs: 3, fat: 0 },
  edamame: { calories: 65, protein: 6, carbs: 5, fat: 3 },
  cucumber: { calories: 10, protein: 0, carbs: 2, fat: 0 },
  tomato: { calories: 12, protein: 1, carbs: 3, fat: 0 },
  'spring-onion': { calories: 4, protein: 0, carbs: 1, fat: 0 },
  sesame: { calories: 18, protein: 1, carbs: 1, fat: 1 },
  seaweed: { calories: 12, protein: 1, carbs: 2, fat: 0 },
  'no-drink': { calories: 0, protein: 0, carbs: 0, fat: 0 },
  'hot-tea': { calories: 2, protein: 0, carbs: 0, fat: 0 },
  'cold-tea': { calories: 25, protein: 0, carbs: 6, fat: 0 },
  'sparkling-water': { calories: 0, protein: 0, carbs: 0, fat: 0 },
  'protein-soy': { calories: 95, protein: 8, carbs: 6, fat: 4 },

  // Addon seasonings
  'soy-sauce': { calories: 8, protein: 1, carbs: 1, fat: 0 },
  'sea-salt': { calories: 0, protein: 0, carbs: 0, fat: 0 },
  'chili-oil': { calories: 40, protein: 0, carbs: 0, fat: 4 },
  'black-vinegar': { calories: 4, protein: 0, carbs: 1, fat: 0 },
  'sesame-oil': { calories: 40, protein: 0, carbs: 0, fat: 4 },
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

function addNutrition(base, add, multiplier = 1) {
  if (!add || !multiplier) return;
  base.calories += (add.calories || 0) * multiplier;
  base.protein += (add.protein || 0) * multiplier;
  base.carbs += (add.carbs || 0) * multiplier;
  base.fat += (add.fat || 0) * multiplier;
}

function normalizedNutrition(n) {
  return {
    calories: Math.max(0, Math.round(n.calories)),
    protein: Math.max(0, Math.round(n.protein)),
    carbs: Math.max(0, Math.round(n.carbs)),
    fat: Math.max(0, Math.round(n.fat)),
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

  const schema = isBuilderItem(item)
    ? builderSchema
    : (item.customization_schema || item.customizationSchema || {});
  const optionQuantities = customization?.optionQuantities || {};
  const addonQuantities = customization?.addonQuantities || {};

  for (const group of schema.singleChoice || []) {
    const selected = customization?.singleChoice?.[group.key];
    const add = optionNutrition[selected] || null;
    if (add) addNutrition(base, add, 1);
  }

  for (const group of schema.multiChoice || []) {
    const selected = customization?.multiChoice?.[group.key] || [];
    for (const code of selected) {
      const add = optionNutrition[code] || null;
      const quantity = Math.max(1, Number(optionQuantities[code] || 1));
      if (add) addNutrition(base, add, quantity);
    }
  }

  for (const [code, rawQty] of Object.entries(addonQuantities)) {
    const qty = Math.max(0, Number(rawQty || 0));
    const add = optionNutrition[code] || null;
    if (add && qty) addNutrition(base, add, qty);
  }

  return normalizedNutrition(base);
}

export function applyBuilderPreset(presetKey, currentCustomization) {
  const next = structuredClone(currentCustomization || { singleChoice: {}, multiChoice: {}, optionQuantities: {}, addonQuantities: {}, notes: '' });
  next.optionQuantities = {};
  next.addonQuantities = {};
  next.singleChoice = next.singleChoice || {};
  next.multiChoice = next.multiChoice || {};
  if (presetKey === 'Office lunch') {
    next.singleChoice.base = 'rice';
    next.singleChoice.protein = 'chicken';
    next.singleChoice.sauce = 'ginger-scallion';
    next.singleChoice.spice = 'none';
    next.singleChoice.drink = 'cold-tea';
    next.multiChoice.sides = ['broccoli'];
    next.multiChoice.vegetables = ['bok-choy'];
    next.multiChoice.toppings = ['spring-onion'];
    next.optionQuantities.broccoli = 1;
    next.optionQuantities['bok-choy'] = 1;
    next.optionQuantities['spring-onion'] = 1;
    next.addonQuantities['soy-sauce'] = 1;
  } else if (presetKey === 'High protein') {
    next.singleChoice.base = 'salad';
    next.singleChoice.protein = 'salmon';
    next.singleChoice.sauce = 'black-pepper';
    next.singleChoice.spice = 'mild';
    next.singleChoice.drink = 'protein-soy';
    next.multiChoice.sides = ['fried-egg', 'broccoli'];
    next.multiChoice.vegetables = ['edamame'];
    next.multiChoice.toppings = ['sesame'];
    next.optionQuantities['fried-egg'] = 1;
    next.optionQuantities.broccoli = 1;
    next.optionQuantities.edamame = 1;
    next.optionQuantities.sesame = 1;
  } else if (presetKey === 'Lighter') {
    next.singleChoice.base = 'salad';
    next.singleChoice.protein = 'tofu';
    next.singleChoice.sauce = 'none';
    next.singleChoice.spice = 'none';
    next.singleChoice.drink = 'sparkling-water';
    next.multiChoice.sides = ['broccoli'];
    next.multiChoice.vegetables = ['cucumber', 'tomato'];
    next.multiChoice.toppings = ['seaweed'];
    next.optionQuantities.broccoli = 1;
    next.optionQuantities.cucumber = 1;
    next.optionQuantities.tomato = 1;
    next.optionQuantities.seaweed = 1;
    next.addonQuantities['sea-salt'] = 1;
  }
  return next;
}
