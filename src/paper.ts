export type Spec = {
  w: number,
  h: number,
  dots?: number
}

export enum LabelType {
  Label29x90,
  Label38x90
}

export namespace LabelType {
  export function width(type: LabelType): number {
    switch (type) {
      case LabelType.Label29x90:
        return 29;
      case LabelType.Label38x90:
        return 38;
    }
  }

  export function height(type: LabelType): number {
    switch (type) {
      case LabelType.Label29x90:
        return 90;
      case LabelType.Label38x90:
        return 90;
    }
  }

  export function spec(type: LabelType): Spec {
    switch (type) {
      case LabelType.Label29x90:
        return {
          w: 29,
          h: 90,
          dots: 991,
        }
      case LabelType.Label38x90:
        return {
          w: 38,
          h: 90,
          dots: 991,
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
  export function width(type: RollType): number {
    switch (type) {
      case RollType.Roll12:
        return 12;
      case RollType.Roll29:
        return 29;
      case RollType.Roll38:
        return 38;
      case RollType.Roll50:
        return 50;
      case RollType.Roll54:
        return 54;
      case RollType.Roll62:
        return 62;
    }
  }

  export function spec(type: RollType, length: number): Spec {
    const dots: number = Math.floor(300 / 25.4 * length);

    switch (type) {
      case RollType.Roll12:
        return {
          w: 12,
          h: length,
          dots,
        };
      case RollType.Roll29:
        return {
          w: 29,
          h: length,
          dots,
        }
      case RollType.Roll38:
        return {
          w: 38,
          h: length,
          dots,
        };
      case RollType.Roll50:
        return {
          w: 50,
          h: length,
          dots,
        };
      case RollType.Roll54:
        return {
          w: 54,
          h: length,
          dots,
        }
      case RollType.Roll62:
        return {
          w: 62,
          h: length,
          dots,
        }
    }
  }


  export function fromSize(w: number): RollType | undefined {
    if (w === 12) return RollType.Roll12;
    else if (w === 29) return RollType.Roll29;
    else return undefined;
  }
}

interface Roll {
  kind: "roll";
  type: RollType;
  length: number;
}

export type Paper = Label | Roll;

export namespace Paper {
  export function width(paper: Paper): number {
    switch (paper.kind) {
      case "label":
        return LabelType.width(paper.type);
      case "roll":
        return RollType.width(paper.type);
    }
  }
  export function height(paper: Paper): number {
    switch (paper.kind) {
      case "label":
        return LabelType.height(paper.type);
      case "roll":
        return paper.length;
    }
  }

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


