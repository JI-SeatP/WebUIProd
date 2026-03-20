
  SELECT
    V.NOPSEQ,
    V.NO_PROD,
    V.QTE_PRODUITE,
    V.TRANSAC,
    V.NOM_CLIENT,
    V.Panneau,
    V.INVENTAIRE_S,
    V.Presses,
    V.QTE_COMMANDEE,
    V.QTE_A_LIVRER,
    V.NO_INVENTAIRE,
    V.NEXTOPERATION_S,
    V.NEXTOPERATION_P,
    V.SCDESC_S,
    V.REVISION,
    V.DeDescription_P,
    V.EQDEBUTQUART,
    V.PRODUIT_CODE,
    V.PRODUIT_S
FROM AF_SEATPLY_EXT.dbo.vEtiquettesProduction AS V WITH (NOLOCK)
ORDER BY
    V.TRANSAC,
    V.NOPSEQ;



![[PRESS Label Sample_data.png]]

![[]]![[PRESS Label Sample_Fields.png.png]]