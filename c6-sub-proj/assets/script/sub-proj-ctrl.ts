
interface Message {
    type: MESSAGE_TYPE,
    data: any
}

enum MESSAGE_TYPE {
    SCORE = 'SCORE',
    RESIZE = 'RESIZE',
    SHOW_RANK = 'SHOW_RANK',
}

const {ccclass, property} = cc._decorator;
@ccclass
export default class NewClass extends cc.Component {

    @property(cc.Node)
    rankPanel: cc.Node = null;

    @property(cc.Node)
    content: cc.Node = null;

    @property(cc.Node)
    item: cc.Node = null;

    private _userInfo: wx.types.UserInfo;

    protected onLoad(): void {
        wx.onMessage(this._onMsg.bind(this));
        this.item.removeFromParent();
    }

    private _onMsg(msg: Message): void {
        this._dealMsg(msg);
        console.log('on msg, type:', msg.type, 'data:', msg.data);
    }

    private _dealMsg(msg: Message): void {
        switch(msg.type) {
            case MESSAGE_TYPE.SCORE:
            let score: number = Number(msg.data);
            this._onScoreMsg(score);
            break;

            case MESSAGE_TYPE.RESIZE:
            let size = JSON.parse(msg.data);
            this._resize(size);
            break;

            case MESSAGE_TYPE.SHOW_RANK:
            if(this._userInfo) this._showRankPanel()
            else {
                wx.getUserInfo({
                    openIdList: ['selfOpenId'],
                    success: (res) => {
                        this._userInfo = res.data[0];
                        this._showRankPanel();
                    },
                })
            }
            break;
        }
    }

    private _onScoreMsg(score: number): void {
        wx.getUserCloudStorage({
            keyList: ['score'],
            success: (result) => {
                let maxScore: number = Number(result.KVDataList[0] && result.KVDataList[0].value) || 0;
                if(maxScore < score) {
                    wx.setUserCloudStorage({
                        KVDataList: [{key: 'score', value: String(score)}]
                    })
                }
            },
            fail: () => {
                wx.setUserCloudStorage({
                    KVDataList: [{key: 'score', value: String(score)}]
                })
            }
        })
    }

    private _resize(size: {width: number, height: number}): void {
        cc.view.setDesignResolutionSize(size.width, size.height, cc.ResolutionPolicy.NO_BORDER);
    }

    private _showRankPanel(): void {
        if(!this._userInfo) return;
        this.content.destroyAllChildren();
        wx.getFriendCloudStorage({
            keyList: ['score'],
            success: (res) => {
                let userDatas: UserGameData[] = res.data;
                userDatas.sort((d1, d2) => {
                    let score1 = Number(d1.KVDataList[0] && d1.KVDataList[0].value) || 0;
                    let score2 = Number(d2.KVDataList[0] && d2.KVDataList[0].value) || 0;
                    return score2 - score1;
                });

                for(let i = 0; i < userDatas.length; i++) {
                    let d = userDatas[i]
                    let item = cc.instantiate(this.item);
                    let img = new Image();
                    img.src = d.avatarUrl;
                    img.onload = () => {
                        let tex = new cc.Texture2D()
                        tex.initWithElement(img);
                        item.getChildByName('rank').getComponent(cc.Label).string = String(i + 1);
                        item.getChildByName('head').getComponent(cc.Sprite).spriteFrame = new cc.SpriteFrame(tex);
                        let name = item.getChildByName('name').getComponent(cc.Label);
                        name.string = d.nickname;
                        let c = cc.color()
                        c.fromHEX(d.avatarUrl === this._userInfo.avatarUrl ? '#ECF14A' : '#FFFFFF')
                        name.node.color = c;
                        item.getChildByName('score').getComponent(cc.Label).string = d.KVDataList[0] && d.KVDataList[0].value || '0';
                    }
                    this.content.addChild(item);
                }
            }
        })
    }
}
