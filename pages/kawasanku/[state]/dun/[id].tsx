import type { GeoJsonObject } from "geojson";
import { InferGetStaticPropsType, GetStaticProps, GetStaticPaths } from "next";
import { Page } from "@lib/types";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import KawasankuDashboard from "@dashboards/kawasanku";
import Metadata from "@components/Metadata";
import MalaysiaGeojson from "@lib/geojson/malaysia.json";
import { useTranslation } from "next-i18next";
import { STATE_MAP, DUNS } from "@lib/schema/kawasanku";
import { get } from "@lib/api";
import { useWatch } from "@hooks/useWatch";
import { useState } from "react";

const KawasankuArea: Page = ({
  ctx,
  bar,
  jitterplot,
  jitterplot_options,
  pyramid,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { t } = useTranslation();
  const [geo, setGeo] = useState<undefined | GeoJsonObject>(undefined);

  useWatch(
    () => {
      import(`@lib/geojson/kawasanku/dun/${ctx.id}`).then(item => {
        setGeo(item.default as unknown as GeoJsonObject);
      });
    },
    [ctx.id],
    true
  );

  return (
    <>
      <Metadata
        title={`${t("nav.megamenu.dashboards.kawasanku")} • 
        ${DUNS[ctx.state].find(dun => dun.value === ctx.id)?.label}`}
        description={t("kawasanku.description")}
        keywords={""}
      />
      <KawasankuDashboard
        area_type="dun"
        bar={bar}
        jitterplot={jitterplot}
        pyramid={pyramid}
        jitterplot_options={jitterplot_options}
        geojson={geo}
      />
    </>
  );
};

export const getStaticPaths: GetStaticPaths = () => {
  /* First visit: SSR, consequent visits: ISR */

  //   let paths: Array<any> = [];

  //   STATES.filter(
  //     state =>
  //       !["malaysia", "w.p._kuala_lumpur", "w.p._putrajaya", "w.p._labuan"].includes(state.value)
  //   ).forEach(state => {
  //     DUNS[state.value].forEach(({ value }) => {
  //       paths = paths.concat([
  //         {
  //           params: {
  //             state: state.value,
  //             id: value,
  //           },
  //         },
  //         {
  //           params: {
  //             state: state.value,
  //             id: value,
  //           },
  //           locale: "ms-MY",
  //         },
  //       ]);
  //     });
  //   });

  return {
    paths: [],
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps = async ({ locale, params }) => {
  const i18n = await serverSideTranslations(locale!, ["common"]);

  const { data } = await get("/dashboard/", {
    "dashboard": "kawasanku_electoral",
    "area": params!.id,
    "area-type": "dun",
  });

  const options = Object.entries(DUNS).flatMap(([key, duns]) =>
    duns.map(({ label, value }) => ({
      label: `${label}, ${STATE_MAP[key]}`,
      value: value,
    }))
  );

  return {
    props: {
      ...i18n,
      ctx: params,
      bar: data.bar_chart,
      jitterplot: data.jitter_chart,
      pyramid: data.pyramid_chart,
      jitterplot_options: options,
    },
    revalidate: 60 * 60 * 24, // 1 day (in seconds)
  };
};

export default KawasankuArea;
