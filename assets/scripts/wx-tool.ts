
declare let wx: any;

export namespace WxTool {

    /**
     * 是否在微信平台
     */
    export let isWx = function(): boolean {
        if(!CC_WECHATGAME) cc.warn('not in wechat platform');
        return CC_WECHATGAME;
    }

    /**
     * 获取所有权限信息
     * @param cb 回调函数 res: {[scope: string]: boolean}
     */
    export let getSetting = function(cb: (res: any) => void): void {
        wx.getSetting({
            success: function(res) {
                cb(res.authSetting);
            },
            fail: function(res) {
                cb({});
            }
        });
    }

    /**
     * 是否有某个权限
     * @param scope 权限字段，详情 https://developers.weixin.qq.com/miniprogram/dev/dev/tutorial/open-ability/authorize.html#scope-列表
     * @param cb 回调函数
     */
    export let hasAuthorize = function(scope: string, cb: (has: boolean) => void) {
        getSetting((res) => {
            let has: boolean = false;
            if(res && res[scope]) {
                has = true;
            }
            cb(has);
        })
    }

    /**
     * 获取权限
     * @param scope 权限字段，详情 https://developers.weixin.qq.com/miniprogram/dev/dev/tutorial/open-ability/authorize.html#scope-列表
     * @param cb 回调函数
     */
    export let getAuthorize = function(scope: string, cb: (isSuccess: boolean) => void) {
        hasAuthorize(scope, (has) => {
            if(has) {
                cb(true);
            } else {
                wx.authorize({
                    scope: scope,
                    success: function(res): void {
                        cb(true);
                    },
                    fail: function(res): void {
                        wx.openSetting({
                            success: function(res): void {
                                cb(true);
                            },
                            fail: function(res): void {
                                cb(false);
                            }
                        })
                    }
                })
            }
        });
    }

    export let share = function(imgUrl: string, title: string, exData: {[key: string]: number | string}) {
        let query: string = '';
        let keys: string[] = Object.keys(exData);
        for(let i = 0; i < keys.length; i++) {
            if(i !== 0) query += '&';
            query += `${keys[i]}=${exData[keys[i]]}`;
        }
        wx.shareAppMessage({
            title: title || '分享分享',
            imageUrl: imgUrl,
            query: query,
        })
    }

    export let setOnShowCall = function(cb: (scene: string, query: any, shareTicket: string, referrerInfo?: any) => void) {
        wx.onShow(function(res) {
            cb(res.scene, res.query, res.shareTicket, res.referrerInfo);
        });
    }
}