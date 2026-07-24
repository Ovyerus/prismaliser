import {
  CompositeDidDocumentResolver,
  LocalActorResolver,
  PlcDidDocumentResolver,
  WebDidDocumentResolver,
  XrpcHandleResolver,
} from "@atcute/identity-resolver";

import { SLINGSHOT_ORIGIN } from "~/atproto/constants";

export const actorResolver = new LocalActorResolver({
  handleResolver: new XrpcHandleResolver({ serviceUrl: SLINGSHOT_ORIGIN }),
  didDocumentResolver: new CompositeDidDocumentResolver({
    methods: {
      plc: new PlcDidDocumentResolver(),
      web: new WebDidDocumentResolver(),
    },
  }),
});
