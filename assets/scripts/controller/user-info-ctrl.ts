import { WxTool } from "../wx-tool";

const {ccclass, property} = cc._decorator;
@ccclass
export default class NewClass extends cc.Component {

    @property(cc.Sprite)
    head: cc.Sprite = null;

    @property(cc.Label)
    userName: cc.Label = null;

    protected onLoad (): void{
        if(!CC_WECHATGAME) return;

        this._getUserInfo.bind(this);

        WxTool.hasAuthorize('scope.userInfo', (has) => {
            if(!has) {
                WxTool.getAuthorize('scope.userInfo', (success) => {
                    if(success) {
                        wx.getUserInfo({
                            success: (res) => {
                                this._init(res.userInfo);
                            }
                        });
                    }
                })
            } else {
                wx.getUserInfo({
                    success: (res) => {
                        this._init(res.userInfo);
                    }
                });
            }
        });

        
        
    }

    protected onDestroy (): void{

    }

    private _getUserInfo(cb: (data: any) => void): void {
        wx.getUserInfo({
            success: function(res) {
                cb(res.userInfo);
            }
        });
    }

    private _init(userInfo: wx.types.UserInfo): void {
        this.userName.string = userInfo.nickName;
        let img = new Image();
        img.src = userInfo.avatarUrl;
        img.onload = () => {
            let tex = new cc.Texture2D();
            tex.initWithElement(img);
            let sf = new cc.SpriteFrame(tex);
            this.head.spriteFrame = sf;
        }
    }
}
