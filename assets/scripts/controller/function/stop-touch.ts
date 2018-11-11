
const {ccclass, property, menu} = cc._decorator;
@ccclass
@menu('功能组件/屏蔽触摸')
export default class StopTouch extends cc.Component {
    protected onLoad (): void{
        this.node.on(cc.Node.EventType.TOUCH_START, this._onTouch, this);
    }

    protected onDestroy(): void {
        this.node.off(cc.Node.EventType.TOUCH_START, this._onTouch, this);        
    }

    protected _onTouch(event: cc.Event.EventTouch): void {
        event.stopPropagation();
    }
}
