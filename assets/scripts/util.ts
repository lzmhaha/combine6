
const X_BASE: number = -138;
const Y_BASE1: number = 87;
const Y_BASE2: number = 127;
const X_DELTA = 69;
const Y_DELTA = 80;

export namespace Util {
    /**
     * 位置转到及具体的坐标
     * @param x 
     * @param y 
     */
    export let grid2Pos = function(grid: cc.Vec2): cc.Vec2 {
        let pos = cc.v2();
        pos.x = X_BASE + grid.x * X_DELTA;
        pos.y = (grid.x % 2 === 0 ? Y_BASE1 : Y_BASE2) + grid.y * Y_DELTA;
        return pos;
    }

    export let grid2Id = function(g): string {
        return `${g.x}-${g.y}`;
    }

    export let id2Grid = function(id: string): cc.Vec2 {
        return cc.v2(...id.split('-').map((s) => {return Number(s);}));
    }
}