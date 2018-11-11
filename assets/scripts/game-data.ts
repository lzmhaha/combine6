import { Util } from "./util";
import { GameInfo } from "./controller/game-ctrl";

const MAX_X = 5;
const MAX_Y = 8;
const LEVEL_BASE = 3;

export enum MOVE_RESULT {
    SUCCESS = 'SUCCESS',
    FAIL = 'FAIL',
}

export default class GameData {
    public static ins: GameData;

    private _grids: number[][];
    private _selectedGrid: cc.Vec2;// 选中的xx
    private _lastMoveGrid: cc.Vec2;// 最后一次移动的点
    private _score: number;
    private _moveResult: MOVE_RESULT;

    constructor() {
        GameData.ins = this;
        this._grids = new Array<number[]>(MAX_X);
        for(let i = 0; i < MAX_X; i++) {
            this._grids[i] = new Array<number>(MAX_Y);
            for(let j = 0; j < MAX_Y; j++) {
                this._grids[i][j] = 0;
            }
        }
        this._score = 0;
    }

    public initWithData(gameInfo: GameInfo): void {
        this._score = gameInfo.score;
    }

    public getGameData(): GameInfo {
        return {
            score: this._score,
            grids: this._grids,
        };
    }

    public isOccupy(grid: cc.Vec2): boolean {
        return !!this._grids[grid.x][grid.y];
    }

    /**
     * 两个位置是否相邻
     * @param grid1 
     * @param grid2 
     */
    public isNear(grid1: cc.Vec2, grid2: cc.Vec2): boolean {
        let x1 = grid1.x, y1 = grid1.y;
        let x2 = grid2.x, y2 = grid2.y;
        if(x1 === x2) {
            return Math.abs(y1 - y2) === 1;
        }
        if(y1 === y2) return true;

        if(Math.abs(x1 - x2) === 1 && Math.abs(y1 - y2) === 1) {
            if((x1 % 2 === 0)) {
                return y1 > y2;
            } else {
                return y1 < y2;
            }
        }
        return false;
    }

    public getNearEmptyGrids(grid: cc.Vec2): cc.Vec2[] {
        let ret: cc.Vec2[] = [];
        for(let i = -1; i < 2; i ++) {
            for(let j = -1; j < 2; j++) {
                if(i === 0 && j === 0) continue;
                let g = grid.add(cc.v2(i, j));
                if(g.x < 0 || g.y < 0 || g.x >= MAX_X || g.y >= MAX_Y) continue;
                if(this.isOccupy(g)) continue;
                if(!this.isNear(grid, g)) continue;
                ret.push(g);
            }
        }
        return ret;
    }

    /**
     * A*寻路, 获取两个位置的路径
     * @param start 
     * @param goal 
     */
    public getPath(start: cc.Vec2, goal: cc.Vec2): cc.Vec2[] {
        let cur: cc.Vec2 = start; // 目前探索的点
        let from: {[id: string]: string} = {}; // 点的上一个路径点
        let cost: {[id: string]: number} = {}; // 起点到对应点的消耗
        let toTest: string[] = []; // 出于探索区域边缘的点
        cost[Util.grid2Id(start)] = 0;
        toTest.push(Util.grid2Id(start));

        // 在探索的边缘找到新的探索点
        let getNewCur = (): cc.Vec2 => {
            let ret: cc.Vec2 = null;
            let minCost: number = 99999999;
            let curCost = cost[Util.grid2Id(cur)];
            for(let id of toTest) {
                let g = Util.id2Grid(id);
                let costAddDis: number = this._dis(g, goal) + curCost + 1;
                if(!ret || costAddDis < minCost) {
                    ret = g;
                    minCost = costAddDis;
                }
            }
            return ret;
        }

        while(!cur.equals(goal)) {
            let curId = Util.grid2Id(cur);
            let grids: cc.Vec2[] = this.getNearEmptyGrids(cur);
            for(let g of grids) {
                let id = Util.grid2Id(g);
                if(id in cost) continue;
                let minCost = cost[curId] + 1;
                let bestfrom = curId;
                // 在toTest中找到最佳的路径点
                for(let f of this.getNearEmptyGrids(g)) {
                    let fid = Util.grid2Id(f);
                    if(toTest.indexOf(fid) === -1) continue;
                    let c = cost[fid] + 1;
                    if(c < minCost) {
                        minCost = c;
                        bestfrom = fid;
                    }
                }
                cost[id] = minCost;
                from[id] = bestfrom;
                toTest.push(id);
            }
            let curIndex = toTest.indexOf(curId);
            if(curIndex === -1) {
                cc.warn('asdasdasdas');
                debugger;
            } else {
                toTest.splice(curIndex, 1);
            }
            cur = getNewCur();
            if(!cur) break;
        }

        let path: cc.Vec2[] = [];
        if(cur && cur.equals(goal)) {
            // TODO: psuh path
            let startId = Util.grid2Id(start);
            let goalId = Util.grid2Id(goal);
            let tmpId = goalId;
            while(tmpId !== startId) {
                path.unshift(Util.id2Grid(tmpId));
                tmpId = from[tmpId];
            }
        }

        return path;
    }

    private _dis(pos1: cc.Vec2, pos2: cc.Vec2): number {
        return pos1.sub(pos2).mag();
    }

    public select(grid: cc.Vec2): void {
        if(!this.isOccupy(grid)) return;
        this._selectedGrid = cc.v2(grid);
    }

    public getSelectedGrid(): cc.Vec2 {
        return cc.v2(this._selectedGrid);
    }

    public move(to: cc.Vec2): cc.Vec2[] {
        if(this.isOccupy(to) || !this._selectedGrid) return null;

        let from = this._selectedGrid;
        let path: cc.Vec2[] = this.getPath(from, to);
        if(!path.length) return null;

        this._lastMoveGrid = to;
        this._selectedGrid = null;
        let tmp = this._grids[from.x][from.y];
        this._grids[from.x][from.y] = 0;
        this._grids[to.x][to.y] = tmp;

        if(this._check().length) this._moveResult = MOVE_RESULT.SUCCESS;
        else this._moveResult = MOVE_RESULT.FAIL;

        return path;
    }

    // 只计算一次，不嵌套
    public calculate(): cc.Vec2[][] {
        let groups: cc.Vec2[][] = this._check();
        for(let group of groups) {
            let head: number = 0;
            for(let i = 0; i < group.length; i++) {
                if(!this._lastMoveGrid) break;
                if(group[i].equals(this._lastMoveGrid)) {
                    head = i;
                    break;
                }
            }

            if(head) {
                let tmp = group.splice(head, 1)[0];
                group.unshift(tmp);
            }

            for(let i = 0; i < group.length; i++) {
                let grid = group[i];
                if(i === 0) {
                    this._grids[grid.x][grid.y] *= 4;
                } else {
                    this._score += this._grids[grid.x][grid.y] * 10;
                    this._grids[grid.x][grid.y] = 0;
                }
            }
        }
        return groups;
    }

    private _check(): cc.Vec2[][] {
        // todo: 检查结群的xx
        let ret: cc.Vec2[][] = [];
        let hasCheck: boolean[][] = new Array<boolean[]>(MAX_X);
        for(let i = 0; i < MAX_X; i++) {
            hasCheck[i] = new Array<boolean>(MAX_Y);
        }

        let getGroup = (block: cc.Vec2, group: cc.Vec2[]) => {
            for(let b of this._getNearBlock(block)) {
                if(hasCheck[b.x][b.y]) continue;
                if(this._grids[block.x][block.y] === this._grids[b.x][b.y]) {
                    hasCheck[b.x][b.y] = true;
                    group.push(b);
                    getGroup(b, group);
                }
            }
        }

        let complete: boolean = false;
        for(let i = 0; i < MAX_X; i++) {
            for(let j = 0; j < MAX_Y; j++) {
                let grid = cc.v2(i, j);
                if(hasCheck[i][j]) continue;
                hasCheck[i][j] = true;
                if(!this.isOccupy(grid)) continue;
                let group = [grid];
                getGroup(grid, group);
                if(group.length >= 4) ret.push(group);
            }
        }

        return ret;
    }

    private _getNearBlock(grid: cc.Vec2): cc.Vec2[] {
        let ret: cc.Vec2[] = [];
        for(let i = -1; i < 2; i ++) {
            for(let j = -1; j < 2; j++) {
                if(i === 0 && j === 0) continue;
                let g = grid.add(cc.v2(i, j));
                if(g.x < 0 || g.y < 0 || g.x >= MAX_X || g.y >= MAX_Y) continue;
                if(!this.isOccupy(g)) continue;
                if(!this.isNear(grid, g)) continue;
                ret.push(g);
            }
        }
        return ret;
    }

    private _isSameNum(g1: cc.Vec2, g2: cc.Vec2): boolean {
        if(g1.equals(g2)) {
            cc.warn('check with same grid');
            return true;
        }
        if(!this.isOccupy(g1)) return false;
        return this._grids[g1.x][g1.y] === this._grids[g2.x][g2.y];
    }

    public addGrid(grid: cc.Vec2, num: number): void {
        this._grids[grid.x][grid.y] = num;
    }

    public getNumber(grid: cc.Vec2): number {
        return this._grids[grid.x][grid.y];
    }

    public getEmptyGrid(): cc.Vec2[] {
        let ret: cc.Vec2[] = [];

        for(let i = 0; i < MAX_X; i++) {
            for(let j = 0; j < MAX_Y; j++) {
                if(this._grids[i][j]) continue;
                ret.push(cc.v2(i, j));
            }
        }

        return ret;
    }

    public getScore(): number {
        return this._score;
    }

    public getLevel(): number {
        if(this._score < 1000) return LEVEL_BASE;
        let level = LEVEL_BASE + Math.log2(this._score / 1000);
        return level | 0;
    }

    public getMoveResult(): MOVE_RESULT {
        return this._moveResult;
    }

    public clear(): void {
        for(let i = 0; i < MAX_X; i++) {
            for(let j = 0; j < MAX_Y; j++) {
                this._grids[i][j] = 0;
            }
        }
        this._selectedGrid = null;
        this._lastMoveGrid = null;
        this._score = 0;
        this._moveResult = null;
    }
 }