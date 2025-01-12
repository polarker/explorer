/*
Copyright 2018 - 2022 The Alephium Authors
This file is part of the alephium project.

The library is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

The library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with the library. If not, see <http://www.gnu.org/licenses/>.
*/

import { APIError } from '@alephium/sdk'
import { BlockEntryLite, Output, PerChainHeight, Transaction, UOutput } from '@alephium/sdk/api/explorer'
import { Check } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { usePageVisibility } from 'react-page-visibility'
import { useParams } from 'react-router-dom'

import Amount from '../components/Amount'
import Badge from '../components/Badge'
import InlineErrorMessage from '../components/InlineErrorMessage'
import { AddressLink, SimpleLink } from '../components/Links'
import LoadingSpinner from '../components/LoadingSpinner'
import Section from '../components/Section'
import SectionTitle from '../components/SectionTitle'
import HighlightedCell from '../components/Table/HighlightedCell'
import Table from '../components/Table/Table'
import TableBody from '../components/Table/TableBody'
import TableRow from '../components/Table/TableRow'
import Timestamp from '../components/Timestamp'
import { useGlobalContext } from '../contexts/global'
import useInterval from '../hooks/useInterval'

type ParamTypes = {
  id: string
}

const TransactionInfoPage = () => {
  const { id } = useParams<ParamTypes>()
  const { client } = useGlobalContext()
  const [txInfo, setTxInfo] = useState<Transaction>()
  const [txBlock, setTxBlock] = useState<BlockEntryLite>()
  const [txChain, setTxChain] = useState<PerChainHeight>()
  const [txInfoStatus, setTxInfoStatus] = useState<number>()
  const [txInfoError, setTxInfoError] = useState('')
  const [loading, setLoading] = useState(true)
  const isAppVisible = usePageVisibility()

  const getTxInfo = useCallback(async () => {
    const fetchTransactionInfo = async () => {
      if (!client || !id) return

      setLoading(true)

      try {
        const { data, status } = await client.transactions.getTransactionsTransactionHash(id)
        const tx = data as Transaction

        if (tx) setTxInfo(tx)

        setTxInfoStatus(status)

        if (!isTxConfirmed(tx)) return

        const { data: block } = await client.blocks.getBlocksBlockHash(tx.blockHash)
        const { data: chainHeights } = await client.infos.getInfosHeights()

        setTxBlock(block)

        const chain = chainHeights.find(
          (c: PerChainHeight) => c.chainFrom === block.chainFrom && c.chainTo === block.chainTo
        )

        setTxChain(chain)
      } catch (e) {
        console.error(e)
        const { error, status } = e as APIError

        setTxInfoStatus(status)
        setTxInfoError(error.detail || error.message || 'Unknown error')
      }
    }

    fetchTransactionInfo()
    setLoading(false)
  }, [client, id])

  // Initial fetch
  useEffect(() => {
    getTxInfo()
  }, [getTxInfo])

  // Polling when TX is unconfirmed
  useInterval(
    () => {
      if (txInfo && !isTxConfirmed(txInfo)) getTxInfo()
    },
    15 * 1000,
    !isAppVisible
  )

  // Compute confirmations
  const confirmations = computeConfirmations(txBlock, txChain)

  // https://github.com/microsoft/TypeScript/issues/33591
  const outputs: Array<Output | UOutput> | undefined = txInfo && txInfo.outputs && txInfo.outputs

  return (
    <Section>
      <SectionTitle title="Transaction" />
      {!txInfoError ? (
        <Table bodyOnly isLoading={loading} minHeight={450}>
          {txInfo && (
            <TableBody>
              <TableRow>
                <td>Hash</td>
                <HighlightedCell textToCopy={txInfo.hash}>{txInfo.hash}</HighlightedCell>
              </TableRow>
              <TableRow>
                <td>Status</td>
                {isTxConfirmed(txInfo) ? (
                  <td>
                    <Badge
                      type="plus"
                      content={
                        <span>
                          <Check style={{ marginRight: 5 }} size={15} />
                          Success
                        </span>
                      }
                      inline
                    />
                  </td>
                ) : (
                  <td>
                    <Badge
                      type="neutral"
                      content={
                        <>
                          <LoadingSpinner style={{ marginRight: 5 }} size={15} />
                          <span>Pending</span>
                        </>
                      }
                    />
                  </td>
                )}
              </TableRow>
              {isTxConfirmed(txInfo) && txInfo.blockHash && txBlock && (
                <TableRow>
                  <td>Block</td>
                  <td>
                    <SimpleLink
                      to={`../blocks/${txInfo.blockHash || ''}`}
                      data-tip={`On chain ${txChain?.chainFrom} → ${txChain?.chainTo}`}
                    >
                      {txBlock?.height.toString()}
                    </SimpleLink>
                    <span data-tip="Number of blocks mined since" style={{ marginLeft: 10 }}>
                      <Badge
                        type="neutral"
                        content={
                          <span>
                            {confirmations} {confirmations === 1 ? 'Confirmation' : 'Confirmations'}
                          </span>
                        }
                        inline
                      />
                    </span>
                  </td>
                </TableRow>
              )}
              {isTxConfirmed(txInfo) && txInfo.timestamp && (
                <TableRow>
                  <td>Timestamp</td>
                  <td>
                    <Timestamp timeInMs={txInfo.timestamp} forceHighPrecision />
                  </td>
                </TableRow>
              )}
              {isTxConfirmed(txInfo) && (
                <TableRow>
                  <td>Inputs</td>
                  <td>
                    {txInfo.inputs && txInfo.inputs.length > 0
                      ? txInfo.inputs.map((v, i) => (
                          <AddressLink address={v.address} txHashRef={v.txHashRef} key={i} amount={BigInt(v.amount)} />
                        ))
                      : 'Block Rewards'}
                  </td>
                </TableRow>
              )}
              {isTxConfirmed(txInfo) && (
                <TableRow>
                  <td>Outputs</td>
                  <td>
                    {txInfo.outputs
                      ? txInfo.outputs.map((v, i) => (
                          <AddressLink address={v.address} key={i} amount={BigInt(v.amount)} txHashRef={v.spent} />
                        ))
                      : '-'}
                  </td>
                </TableRow>
              )}
              <TableRow>
                <td>Gas Amount</td>
                <td>{txInfo.gasAmount || '-'} GAS</td>
              </TableRow>
              <TableRow>
                <td>Gas Price</td>
                <td>
                  <Amount value={BigInt(txInfo.gasPrice)} showFullPrecision />
                </td>
              </TableRow>
              <TableRow>
                <td>Transaction Fee</td>
                <td>
                  <Amount value={BigInt(txInfo.gasPrice) * BigInt(txInfo.gasAmount)} showFullPrecision />
                </td>
              </TableRow>
              <TableRow>
                <td>
                  <b>Total Value</b>
                </td>
                <td>
                  <Badge
                    type="neutralHighlight"
                    amount={outputs && outputs.reduce<bigint>((acc, o) => acc + BigInt(o.amount), BigInt(0))}
                  />
                </td>
              </TableRow>
            </TableBody>
          )}
        </Table>
      ) : (
        <InlineErrorMessage message={txInfoError} code={txInfoStatus} />
      )}
    </Section>
  )
}

const isTxConfirmed = (tx: Transaction): tx is Transaction => {
  return (tx as Transaction).blockHash !== undefined
}

const computeConfirmations = (txBlock?: BlockEntryLite, txChain?: PerChainHeight): number => {
  let confirmations = 0

  if (txBlock && txChain) {
    const chainHeight = txChain.value
    confirmations = chainHeight - txBlock.height + 1
  }

  return confirmations
}

export default TransactionInfoPage
