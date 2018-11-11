
const {ccclass, property, menu} = cc._decorator;
@ccclass
@menu('功能组件/抖动')
export default class Shake extends cc.Component {
    protected onLoad(): void {
        window['ssss'] = this;
    }

    public shake(): void {
        let a1 = cc.scaleTo(0.1, 1.1, 1.1);
        let a2 = cc.scaleTo(0.1, 1, 1);
        this.node.runAction(cc.sequence(a1, a2, a1.clone(), a2.clone()));
    }

    public comeOut(): void {
        this.node.scale = 0;
        this.node.runAction(cc.scaleTo(0.5, 1).easing(cc.easeElasticOut(0.5)))
    }
}