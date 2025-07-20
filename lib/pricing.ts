export interface FranchisePricingConfig {
  franchiseId: string;
  franchiseName: string;

  // Royalty Configuration
  royalty: {
    baseRoyaltyPerMonth: number; // Base royalty amount per month (e.g., 250)
    level1Months: number; // 4 months for Level 1
    level2PlusMonths: number; // 3 months for Level 2+
    discountPercentage: number; // Admin controllable discount on royalty
  };

  // Material Cost Configuration
  materialCosts: {
    // Kit Cost (Level 1 for all programmes)
    kitCost: {
      baseCost: number; // e.g., 1500
      discountPercentage: number; // Admin controllable discount
    };

    // Material Cost (Level 2 to last level)
    level2PlusMaterialCost: {
      baseCost: number; // e.g., 300
      discountPercentage: number; // Admin controllable discount
    };

    // Extra material costs
    extraMaterials: {
      [itemName: string]: {
        baseCost: number;
        discountPercentage: number;
      };
    };
  };

  // GST Configuration
  gst: {
    rate: number; // 18% GST
    includeInRoyalty: boolean;
    includeInMaterialCost: boolean;
  };

  // Payment Options
  paymentOptions: {
    gpay: boolean;
    paytm: boolean;
    netBanking: boolean;
    debitCard: boolean;
    creditCard: boolean;
  };

  // System fields
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// Level definitions
export type StudentLevel =
  | "Level1"
  | "Level2"
  | "Level3"
  | "Level4"
  | "Level5"
  | "Level6"
  | "Level7"
  | "Level8"
  | "Level9"
  | "Level10"
  | "GrandLevel1"
  | "GrandLevel2"
  | "GrandLevel3";

export interface OrderCalculation {
  // Basic details
  franchiseId: string;
  level: StudentLevel;
  quantity: number;

  // Cost breakdown
  kitCost?: {
    baseCost: number;
    discountAmount: number;
    afterDiscount: number;
    gstAmount: number;
    finalCost: number;
  };

  materialCost?: {
    baseCost: number;
    discountAmount: number;
    afterDiscount: number;
    gstAmount: number;
    finalCost: number;
  };

  // Royalty breakdown
  royalty: {
    basePerMonth: number;
    months: number;
    baseTotal: number;
    discountAmount: number;
    afterDiscount: number;
    gstAmount: number;
    finalRoyalty: number;
  };

  // Total calculation
  subtotal: number;
  totalDiscount: number;
  totalGst: number;
  grandTotal: number;
}

// Helper functions
export function isLevel1(level: StudentLevel): boolean {
  return level === "Level1";
}

export function calculateRoyaltyMonths(level: StudentLevel): number {
  return isLevel1(level) ? 4 : 3;
}

export function calculateDiscount(
  baseAmount: number,
  discountPercentage: number
): number {
  return (baseAmount * discountPercentage) / 100;
}

export function calculateGST(amount: number, gstRate: number = 18): number {
  return (amount * gstRate) / 100;
}

export function calculateOrderTotal(
  config: FranchisePricingConfig,
  level: StudentLevel,
  quantity: number,
  includeKit: boolean = true,
  includeMaterial: boolean = true
): OrderCalculation {
  const calculation: OrderCalculation = {
    franchiseId: config.franchiseId,
    level,
    quantity,
    royalty: {
      basePerMonth: config.royalty.baseRoyaltyPerMonth,
      months: calculateRoyaltyMonths(level),
      baseTotal: 0,
      discountAmount: 0,
      afterDiscount: 0,
      gstAmount: 0,
      finalRoyalty: 0,
    },
    subtotal: 0,
    totalDiscount: 0,
    totalGst: 0,
    grandTotal: 0,
  };

  // Calculate royalty
  calculation.royalty.baseTotal =
    calculation.royalty.basePerMonth * calculation.royalty.months * quantity;
  calculation.royalty.discountAmount = calculateDiscount(
    calculation.royalty.baseTotal,
    config.royalty.discountPercentage
  );
  calculation.royalty.afterDiscount =
    calculation.royalty.baseTotal - calculation.royalty.discountAmount;

  if (config.gst.includeInRoyalty) {
    calculation.royalty.gstAmount = calculateGST(
      calculation.royalty.afterDiscount,
      config.gst.rate
    );
  }
  calculation.royalty.finalRoyalty =
    calculation.royalty.afterDiscount + calculation.royalty.gstAmount;

  let totalAmount = calculation.royalty.finalRoyalty;
  let totalDiscountAmount = calculation.royalty.discountAmount;
  let totalGstAmount = calculation.royalty.gstAmount;

  // Calculate kit cost (Level 1 only)
  if (includeKit && isLevel1(level)) {
    const kitBaseCost = config.materialCosts.kitCost.baseCost * quantity;
    const kitDiscountAmount = calculateDiscount(
      kitBaseCost,
      config.materialCosts.kitCost.discountPercentage
    );
    const kitAfterDiscount = kitBaseCost - kitDiscountAmount;
    const kitGstAmount = config.gst.includeInMaterialCost
      ? calculateGST(kitAfterDiscount, config.gst.rate)
      : 0;
    const kitFinalCost = kitAfterDiscount + kitGstAmount;

    calculation.kitCost = {
      baseCost: kitBaseCost,
      discountAmount: kitDiscountAmount,
      afterDiscount: kitAfterDiscount,
      gstAmount: kitGstAmount,
      finalCost: kitFinalCost,
    };

    totalAmount += kitFinalCost;
    totalDiscountAmount += kitDiscountAmount;
    totalGstAmount += kitGstAmount;
  }

  // Calculate material cost (Level 2+)
  if (includeMaterial && !isLevel1(level)) {
    const materialBaseCost =
      config.materialCosts.level2PlusMaterialCost.baseCost * quantity;
    const materialDiscountAmount = calculateDiscount(
      materialBaseCost,
      config.materialCosts.level2PlusMaterialCost.discountPercentage
    );
    const materialAfterDiscount = materialBaseCost - materialDiscountAmount;
    const materialGstAmount = config.gst.includeInMaterialCost
      ? calculateGST(materialAfterDiscount, config.gst.rate)
      : 0;
    const materialFinalCost = materialAfterDiscount + materialGstAmount;

    calculation.materialCost = {
      baseCost: materialBaseCost,
      discountAmount: materialDiscountAmount,
      afterDiscount: materialAfterDiscount,
      gstAmount: materialGstAmount,
      finalCost: materialFinalCost,
    };

    totalAmount += materialFinalCost;
    totalDiscountAmount += materialDiscountAmount;
    totalGstAmount += materialGstAmount;
  }

  calculation.subtotal = totalAmount - totalGstAmount;
  calculation.totalDiscount = totalDiscountAmount;
  calculation.totalGst = totalGstAmount;
  calculation.grandTotal = totalAmount;

  return calculation;
}

// Default pricing configuration template
export function getDefaultPricingConfig(
  franchiseId: string,
  franchiseName: string
): FranchisePricingConfig {
  return {
    franchiseId,
    franchiseName,
    royalty: {
      baseRoyaltyPerMonth: 250,
      level1Months: 4,
      level2PlusMonths: 3,
      discountPercentage: 0,
    },
    materialCosts: {
      kitCost: {
        baseCost: 1500,
        discountPercentage: 0,
      },
      level2PlusMaterialCost: {
        baseCost: 300,
        discountPercentage: 0,
      },
      extraMaterials: {
        "Practice Book": { baseCost: 80, discountPercentage: 0 },
        "Flash Cards": { baseCost: 120, discountPercentage: 0 },
        Calculator: { baseCost: 200, discountPercentage: 0 },
        Workbook: { baseCost: 100, discountPercentage: 0 },
        "Certificate Folder": { baseCost: 50, discountPercentage: 0 },
        Abacus: { baseCost: 150, discountPercentage: 0 },
        "T-Shirt (S)": { baseCost: 180, discountPercentage: 0 },
        "T-Shirt (M)": { baseCost: 200, discountPercentage: 0 },
        "T-Shirt (L)": { baseCost: 220, discountPercentage: 0 },
        "T-Shirt (XL)": { baseCost: 240, discountPercentage: 0 },
      },
    },
    gst: {
      rate: 18,
      includeInRoyalty: true,
      includeInMaterialCost: true,
    },
    paymentOptions: {
      gpay: true,
      paytm: true,
      netBanking: true,
      debitCard: true,
      creditCard: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
  };
}
