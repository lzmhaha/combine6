import { Util } from "../util";
import { COLOR_CFG } from "../game-cfg";

const {ccclass, property} = cc._decorator;
@ccclass
export default class BlockCtrl extends cc.Component {
    @property(cc.Label)
    lbNum: cc.Label = null;

    private _num: number;
    private _posQueue: cc.Vec2[] = [];
    private _moving: boolean = false;

    private _completeCall: () => void;
    private _target: any;

    protected onLoad (): void{

    }

    protected onEnable(): void {

    }

    protected onDisable(): void {

    }

    protected onDestroy (): void{

    }

    public moveWithPath(path: cc.Vec2[], cb?: () => void, target?: any): void {
        for(let grid of path) {
            let pos = Util.grid2Pos(grid);
            this._moveTo(pos);
        }
        this._completeCall = cb;
        this._target = target;
    }

    private _moveTo(pos: cc.Vec2, duration: number = 0.06): void {
        if(this._moving) {
            this._posQueue.push(pos);
        } else {
            this._moving = true;
            this.node.runAction(cc.sequence(
                cc.moveTo(duration, pos),
                cc.callFunc(this._moveCall, this)
            ));
        }
    }

    public moveToGrid(grid: cc.Vec2, duration: number = 0.06, cb?: Function): void {
        let pos = Util.grid2Pos(grid);
        if(!duration) {
            this.node.position = pos;
        } else {
            this.node.runAction(cc.sequence(
                cc.moveTo(duration, pos),
                cc.callFunc(() => {
                    if(cb) cb();
                })
            ));
        }
    }

    public setNumber(num: number): void {
        this._num = num;
        if(!this._isOnLoadCalled) return;
        this.lbNum.string = String(num);
        if(!COLOR_CFG[this._num]) {
            // debugger;
            cc.warn('num', num);
            return ;
        }
        this.node.color = cc.color().fromHEX(COLOR_CFG[this._num]);
    }

    protected _moveCall(): void {
        this._moving = false;
        if(this._posQueue.length) {
            let pos = this._posQueue.shift();
            this._moveTo(pos);
        } else {
            if(this._completeCall) {
                this._completeCall.call(this._target);
            }
        }
    }
}
