export type Spec = {
  w: number,
  h: number,
  dots?: number,
  canonicalName: string,
}

export enum LabelType {
  Label29x90,
  Label38x90,
  Label62x29,
  Label58x58,
  Label39x48,
  Label23x23,
  Label52x29,
  Label29x42,
}

export namespace LabelType {
  const dots23 = 202;
  const dots29 = 271;
  const dots42 = 425;
  const dots48 = 495;
  const dots58 = 618;
  const dots90 = 991;

  export function spec(type: LabelType): Spec {
    switch (type) {
      case LabelType.Label29x90:
        return {
          w: 29,
          h: 90,
          dots: dots90,
          canonicalName: 'om_brother-label-29x90mm_29x90mm',
        }
      case LabelType.Label38x90:
        return {
          w: 38,
          h: 90,
          dots: dots90,
          canonicalName: 'om_brother-label-38x90mm_38x90mm',
        }
      case LabelType.Label62x29:
        return {
          w: 62,
          h: 29,
          dots: dots29,
          canonicalName: 'om_brother-label-29x62mm_29x62mm',
        }
      case LabelType.Label58x58:
        return {
          w: 58,
          h: 58,
          dots: dots58,
          canonicalName: 'om_brother-label-58x58mm_58x58mm',
        }
      case LabelType.Label39x48:
        return {
          w: 39,
          h: 48,
          dots: dots48,
          canonicalName: 'om_brother-label-39x48mm_39x48mm',
        }
      case LabelType.Label23x23:
        return {
          w: 23,
          h: 23,
          dots: dots23,
          canonicalName: 'om_brother-label-23x23mm_23x23mm',
        }
      case LabelType.Label52x29:
        return {
          w: 52,
          h: 29,
          dots: dots29,
          canonicalName: 'om_brother-label-29x52mm_29x52mm',
        }
      case LabelType.Label29x42:
        return {
          w: 29,
          h: 42,
          dots: dots42,
          canonicalName: 'om_brother-label-29x42mm_29x42mm',
        }
    }
  }

  export function fromSize(w: number, h: number): LabelType | null {
    if (w === 29 && h === 90) {
      return LabelType.Label29x90;
    }
    else if (w === 38 && h === 90)
      return LabelType.Label38x90;
    else
      return null;
  }
}

interface Label {
  kind: "label";
  type: LabelType;
}

export enum RollType {
  Roll12,
  Roll29,
  Roll38,
  Roll50,
  Roll54,
  Roll62
}

export namespace RollType {
  export function spec(type: RollType, length: number): Spec {
    const dots: number = Math.floor(300 / 25.4 * length);

    switch (type) {
      case RollType.Roll12:
        return {
          w: 12,
          h: length,
          dots,
          canonicalName: 'roll_current_12x0mm',
        };
      case RollType.Roll29:
        return {
          w: 29,
          h: length,
          dots,
          canonicalName: 'roll_current_29x0mm',
        }
      case RollType.Roll38:
        return {
          w: 38,
          h: length,
          dots,
          canonicalName: 'roll_current_38x0mm',
        };
      case RollType.Roll50:
        return {
          w: 50,
          h: length,
          dots,
          canonicalName: 'roll_current_50x0mm',
        };
      case RollType.Roll54:
        return {
          w: 54,
          h: length,
          dots,
          canonicalName: 'roll_current_54x0mm',
        }
      case RollType.Roll62:
        return {
          w: 62,
          h: length,
          dots,
          canonicalName: 'roll_current_62x0mm',
        }
    }
  }

  export function fromSize(w: number): RollType | null {
    switch (w) {
      case 12:
        return RollType.Roll12;
      case 29:
        return RollType.Roll29;
      case 38:
        return RollType.Roll38;
      case 50:
        return RollType.Roll50;
      case 54:
        return RollType.Roll54;
      case 62:
        return RollType.Roll62;
      default:
        return null;
    }

  }
}

interface Roll {
  kind: "roll";
  type: RollType;
  length: number;
}

export type Paper = Label | Roll;

export namespace Paper {
  export function spec(paper: Paper): Spec {
    switch (paper.kind) {
      case "label":
        return LabelType.spec(paper.type);
      case "roll":
        return RollType.spec(paper.type, paper.length);
    }
  }

  export function isLabel(paper: Paper): boolean {
    switch (paper.kind) {
      case "label":
        return true;
      case "roll":
        return false;
    }
  }
}

