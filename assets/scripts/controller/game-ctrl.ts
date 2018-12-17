import BlockCtrl from "./block-ctrl";
import { Util } from "../util";
import GameData, { MOVE_RESULT } from "../game-data";
import Shake from "./function/shake";

export enum GAME_STATE {
    IDLE = 'IDLE',      // 待机中
    MOVING = 'MOVING',  // 方块移动中
    ADDING = 'ADDING',  // 方块添加中
    OVER = 'OVER',
}

export interface GameInfo {
    grids: number[][],
    score: number,
}

const {ccclass, property} = cc._decorator;
@ccclass
export default class GameCtrl extends cc.Component {
    @property(cc.Node)
    blockBgLayer: cc.Node = null;

    @property(cc.Node)
    blockLayer: cc.Node = null;

    @property(cc.Prefab)
    prefabBlock: cc.Prefab = null;

    @property(cc.Label)
    lbScore: cc.Label = null;

    @property(cc.Node)
    gameOverLayer: cc.Node = null;

    @property(cc.Label)
    lbOverScore: cc.Label = null;

    @property(cc.Node)
    btnPlayAgain: cc.Node = null;

    @property(cc.WXSubContextView)
    subView: cc.WXSubContextView = null;

    @property(cc.Node)
    btnRank: cc.Node = null;

    @property(cc.Node)
    btnCloseRank: cc.Node = null;

    @property(cc.Node)
    rankPanel: cc.Node = null;

    public data: GameData;
    public state: GAME_STATE;

    private _blockBgNodes: {[id: string]: cc.Node} = {};
    private _blockNodes: {[id: string]: cc.Node} = {};
    private _blockPool: cc.NodePool;
    private _hasAdd: boolean;

    protected onLoad (): void{
        window['game'] = this;
        this.state = GAME_STATE.IDLE;
        this._hasAdd = false;
        this.data = new GameData();
        this._blockPool = new cc.NodePool(BlockCtrl);
        this.btnPlayAgain.on('click', this._onPlayAgain, this);
        this._init();
        this._start();

        if(CC_WECHATGAME) {
            // wx.showShareMenu({
                
            // })

            // 显示游戏圈按钮
            // wx.createGameClubButton({
            //     icon: 'white',
            //     style: {
            //       left: 10,
            //       top: 76,
            //       width: 40,
            //       height: 40
            //     }
            // })

            // wx.getOpenDataContext().postMessage({
            //     type: 'RESIZE',
            //     data: JSON.stringify({width: cc.winSize.width, height: cc.winSize.height})
            // });
            // this.subView.updateSubContextViewport()

            this.btnRank.on('click', () => {
                this.rankPanel.active = true;
                wx.getOpenDataContext().postMessage({type: 'SHOW_RANK'});
            });
            this.btnCloseRank.on('click', () => {this.rankPanel.active = false;});
        }

        this.subView.updateSubContextViewport()
    }

    protected onDestroy (): void{
        this.btnPlayAgain.off('click', this._onPlayAgain, this);
        this._blockPool.clear();
    }

    private _cord(): void {
        if(this.state === GAME_STATE.OVER) return;
        cc.sys.localStorage.setItem('game-data', JSON.stringify(this.data.getGameData()));
    }

    private _init(): void {
        for(let i = 0; i < 8; i++) {
            let layer = this.blockBgLayer.children[i];
            for(let j = 0; j < 5; j++) {
                let id = Util.grid2Id(cc.v2(j, i));
                let node = layer.children[j];
                node.name = id;
                this._blockBgNodes[id] = node;
                node.on(cc.Node.EventType.TOUCH_END, this._onBlockBgClick, this);
            }
        }
    }

    private _start(): void {
        let dataStr: string = cc.sys.localStorage.getItem('game-data');
        let gameData: GameInfo = dataStr && JSON.parse(dataStr);
        if(gameData) {
            this.data.initWithData(gameData);
            let blockData: {[id: string]: number} = {};
            for(let i = 0; i < gameData.grids.length; i++) {
                let gs = gameData.grids[i];
                for(let j = 0; j < gs.length; j++) {
                    if(!gs[j]) continue;
                    blockData[Util.grid2Id(cc.v2(i, j))] = gs[j];
                }
            }
            this._addBlockWithData(blockData);
            this.lbScore.string = String(gameData.score);
        } else {
            this._addBlocks(12);
        }
    }

    private _end(): void {
        cc.sys.localStorage.setItem('game-data', null);
        this.state = GAME_STATE.OVER;
        this.gameOverLayer.active = true;
        let score = this.data.getScore();
        this.lbOverScore.string = String(score);

        // 上传分数
        // TODO: 从子域获取最高分
        if(CC_WECHATGAME) {
            wx.setUserCloudStorage({
                KVDataList: [{key: 'score', value: String(score)}],
                success: () => {console.log(`upload score success, score: ${score}`)},
            })
        }
    }

    private _onPlayAgain(): void {
        this.state = GAME_STATE.IDLE;
        this.gameOverLayer.active = false;
        this.data.clear();
        for(let id in this._blockNodes) {
            this._blockNodes[id].stopAllActions();
            this._blockPool.put(this._blockNodes[id]);
        }
        this._start();
    }

    private _addBlocks(count: number): void {
        this._hasAdd = true;
        let gs = this.data.getEmptyGrid();
        let indexs: number[] = [];
        if(count >= gs.length) {
            count = gs.length;
            for(let i = 0; i < gs.length; i++) {
                indexs.push(i);
            }
        } else {
            while(indexs.length < count) {
                let i = Math.floor(Math.random() * gs.length);
                if(indexs.indexOf(i) !== -1) continue;
                indexs.push(i);
            }
        }

        let actionList = [];
        let delayAction = cc.delayTime(0.1);
        for(let i = 0; i < count; i++) {
            let grid = gs[indexs[i]];
            actionList.push(cc.callFunc(() => {
                this._addBlock(grid, 1 << (Math.floor(Math.random() * this.data.getLevel())));
            }));
            if(i !== count - 1) {
                actionList.push(delayAction.clone());
            }
        }
        actionList.push(cc.callFunc(() => {
            this._check();
        }));
        this.node.runAction(cc.sequence(actionList));
        this.state = GAME_STATE.ADDING;
    }

    private _addBlockWithData(data: {[id: string]: number}, random: boolean = true) {
        let actionList = [];
        let delayAction = cc.delayTime(0.1);
        for(let id in data) {
            let grid = Util.id2Grid(id);
            actionList.push(cc.callFunc(() => {
                this._addBlock(grid, data[id]);
            }));
        }
        actionList.push(cc.callFunc(() => {
            this._check();
        }));
        this.node.runAction(cc.sequence(actionList));
        this.state = GAME_STATE.ADDING;
    }

    private _onBlockBgClick(event: cc.Event.EventTouch): void {
        this._hasAdd = false;

        let node: cc.Node = event.target;
        node.getComponent(Shake).shake();
        let id = node.name;
        let grid: cc.Vec2 = Util.id2Grid(id);

        let selectGrid = this.data.getSelectedGrid();
        if(selectGrid && !this.data.isOccupy(grid)) {
            if(this.state !== GAME_STATE.IDLE) return;
            let path = this.data.move(grid);
            if(path && path.length) {
                this.state = GAME_STATE.MOVING;
                this._moveBlock(Util.grid2Id(selectGrid), path);
            }
        } else {
            this.data.select(grid);
            if(this._blockNodes[id]) {
                this._blockNodes[id].getComponent(Shake).shake();
            }
        }
    }

    public _moveBlock(id: string, path: cc.Vec2[]) {
        let block = this._blockNodes[id].getComponent(BlockCtrl);
        block.moveWithPath(path, this._check, this);
        let newId = Util.grid2Id(path[path.length - 1]);
        this._blockNodes[newId] = this._blockNodes[id];
        delete this._blockNodes[id];
    }

    private _check(): void {
        let results: cc.Vec2[][] = this.data.calculate();
        let moveTime = 0.3;
        this.lbScore.string = String(this.data.getScore());
        if(results && results.length) {
            this.state = GAME_STATE.MOVING;
            let toModifyNum: {[id: string]: cc.Node} = {};
            for(let res of results) {
                let targetGrid = res[0];
                for(let i = 0; i < res.length; i++) {
                    let id = Util.grid2Id(res[i]);
                    let node = this._blockNodes[id];
                    let blockCtrl = node.getComponent(BlockCtrl);
                    if(i === 0) {
                        toModifyNum[id] = node;
                    } else {
                        blockCtrl.moveToGrid(targetGrid, moveTime, () => {
                            node.stopAllActions();
                            this._blockPool.put(node);
                        });
                    }
                }
            }
            this.scheduleOnce(() => {
                for(let id in toModifyNum) {
                    let grid = Util.id2Grid(id);
                    let blockCtrl = toModifyNum[id].getComponent(BlockCtrl);
                    blockCtrl.setNumber(this.data.getNumber(grid));
                }
                this._check();
            }, moveTime);
        } else {
            if(!this.data.getEmptyGrid().length) {
                this._end();
                return;
            }
            if(this.state === GAME_STATE.MOVING && this.data.getMoveResult() === MOVE_RESULT.FAIL && !this._hasAdd) {
                this._addBlocks(4);
                return;
            }
            this.state = GAME_STATE.IDLE;
            this._cord();
        }
    }

    private _getBlockNode(): cc.Node {
        let node = this._blockPool.get();
        if(!node) {
            node = cc.instantiate(this.prefabBlock);
        }
        return node;
    }

    public _addBlock(grid: cc.Vec2, num: number): void {
        if(this.data.isOccupy(grid)) {
            cc.warn(`grid ${grid.x} ${grid.y} is occupied`);
            return;
        }
        let id = Util.grid2Id(grid);
        let node = this._getBlockNode();
        this.blockLayer.addChild(node);
        let block = node.getComponent(BlockCtrl);
        block.setNumber(num);
        block.moveToGrid(grid, 0);
        node.getComponent(Shake).comeOut();
        this._blockNodes[id] = node;
        this.data.addGrid(grid, num);
    }
}
