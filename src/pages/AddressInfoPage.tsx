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

import { calAmountDelta, getHumanReadableError } from '@alephium/sdk'
import { AddressBalance, Transaction } from '@alephium/sdk/api/explorer'
import _ from 'lodash'
import { ArrowDownCircle, ArrowRight, ArrowUpCircle } from 'lucide-react'
import { FC, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled, { css, useTheme } from 'styled-components'

import AmountDelta from '../components/AmountDelta'
import Badge from '../components/Badge'
import { AddressLink, TightLink } from '../components/Links'
import LoadingSpinner from '../components/LoadingSpinner'
import PageSwitch from '../components/PageSwitch'
import Section from '../components/Section'
import SectionTitle, { SecondaryTitle } from '../components/SectionTitle'
import HighlightedCell from '../components/Table/HighlightedCell'
import Table, { TDStyle } from '../components/Table/Table'
import TableBody from '../components/Table/TableBody'
import { AnimatedCell, DetailToggle, TableDetailsRow } from '../components/Table/TableDetailsRow'
import TableHeader from '../components/Table/TableHeader'
import TableRow from '../components/Table/TableRow'
import Timestamp from '../components/Timestamp'
import { useGlobalContext } from '../contexts/global'
import usePageNumber from '../hooks/usePageNumber'
import useTableDetailsState from '../hooks/useTableDetailsState'

type ParamTypes = {
  id: string
}

const TransactionInfoPage = () => {
  const { id } = useParams<ParamTypes>()
  const { client, setSnackbarMessage } = useGlobalContext()
  const [txNumber, setTxNumber] = useState<number>()
  const [totalBalance, setTotalBalance] = useState<AddressBalance>()
  const [txListError, setTxListError] = useState('')
  const [txList, setTxList] = useState<Transaction[]>()

  const [txLoading, setTxLoading] = useState(true)
  const [txNumberLoading, setTxNumberLoading] = useState(true)
  const [totalBalanceLoading, setTotalBalanceLoading] = useState(true)

  // Default page
  const pageNumber = usePageNumber()

  // Address info
  useEffect(() => {
    if (!client || !id) return

    const fetchTxNumber = async () => {
      setTxNumberLoading(true)
      setTxNumber(undefined)

      try {
        const { data } = await client.addresses.getAddressesAddressTotalTransactions(id)
        setTxNumber(data)
      } catch (error) {
        console.error(error)
        setSnackbarMessage({
          text: getHumanReadableError(error, 'Error while fetching total transactions number'),
          type: 'alert'
        })
      }

      setTxNumberLoading(false)
    }

    const fetchTotalBalance = async () => {
      setTotalBalanceLoading(true)
      setTotalBalance(undefined)

      try {
        const { data } = await client.addresses.getAddressesAddressBalance(id)
        setTotalBalance(data)
      } catch (error) {
        console.error(error)
        setSnackbarMessage({
          text: getHumanReadableError(error, 'Error while fetching total balance'),
          type: 'alert'
        })
      }

      setTotalBalanceLoading(false)
    }

    fetchTxNumber()
    fetchTotalBalance()
  }, [client, id, setSnackbarMessage])

  // Address transactions
  useEffect(() => {
    if (!client || !id) return

    const fetchTransactions = async () => {
      setTxLoading(true)

      try {
        const { data } = await client.getAddressTransactions(id, pageNumber)
        if (data) setTxList(data)
      } catch (error) {
        console.error(error)
        setTxListError(getHumanReadableError(error, 'Error while fetching transaction list'))
      }

      setTxLoading(false)
    }

    fetchTransactions()
  }, [client, id, pageNumber])

  if (!id) return null

  return (
    <Section>
      <SectionTitle title="Address" />

      <Table bodyOnly minHeight={250}>
        <TableBody tdStyles={AddressTableBodyCustomStyles}>
          <TableRow>
            <td>Address</td>
            <HighlightedCell textToCopy={id} qrCodeContent={id}>
              {id}
            </HighlightedCell>
          </TableRow>
          <TableRow>
            <td>Number of Transactions</td>
            <td>
              {txNumberLoading ? (
                <LoadingSpinner size={14} />
              ) : (
                txNumber ?? <ErrorMessage>Could not get total number of transactions</ErrorMessage>
              )}
            </td>
          </TableRow>
          <TableRow>
            <td>Total Balance</td>
            <td>
              {totalBalanceLoading ? (
                <LoadingSpinner size={14} />
              ) : totalBalance ? (
                <Badge type={'neutralHighlight'} amount={totalBalance.balance} />
              ) : (
                <ErrorMessage>Could not get balance</ErrorMessage>
              )}
            </td>
          </TableRow>
          {totalBalance?.lockedBalance && parseInt(totalBalance.lockedBalance) > 0 && (
            <TableRow>
              <td>Locked Balance</td>
              <td>
                <Badge type={'neutral'} amount={totalBalance.lockedBalance} />
              </td>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <SecondaryTitle>Transactions</SecondaryTitle>

      <Table hasDetails main scrollable isLoading={txLoading}>
        {txList && txList.length ? (
          <>
            <TableHeader
              headerTitles={['', 'Hash', 'Timestamp', '', 'Account(s)', 'Amount', '']}
              columnWidths={['20px', '15%', '100px', '80px', '25%', '120px', '30px']}
              textAlign={['left', 'left', 'left', 'left', 'left', 'right', 'left']}
            />
            <TableBody tdStyles={TxListCustomStyles}>
              {txList
                .sort((t1, t2) => (t2.timestamp && t1.timestamp ? t2.timestamp - t1.timestamp : 1))
                .map((t, i) => (
                  <AddressTransactionRow transaction={t} addressId={id} key={i} />
                ))}
            </TableBody>
          </>
        ) : (
          <TableBody>
            <NoTxMessage>{txListError || 'No transactions yet'}</NoTxMessage>
          </TableBody>
        )}
      </Table>

      {txNumber ? <PageSwitch totalNumberOfElements={txNumber} /> : null}
    </Section>
  )
}

interface AddressTransactionRowProps {
  transaction: Transaction
  addressId: string
}

const AddressTransactionRow: FC<AddressTransactionRowProps> = ({ transaction: t, addressId }) => {
  const theme = useTheme()
  const { detailOpen, toggleDetail } = useTableDetailsState(false)

  const amountDelta = calAmountDelta(t, addressId)
  const isOut = amountDelta < BigInt(0)

  const renderOutputAccounts = () => {
    if (!t.outputs) return
    // Check for auto-sent tx
    if (t.outputs.every((o) => o.address === addressId)) {
      return <AddressLink key={addressId} address={addressId} maxWidth="250px" />
    } else {
      const outputs = _(t.outputs.filter((o) => o.address !== addressId))
        .map((v) => v.address)
        .uniq()
        .value()

      return (
        <AccountsSummaryContainer>
          <AddressLink address={outputs[0]} maxWidth="250px" />
          {outputs.length > 1 && ` (+ ${outputs.length - 1})`}
        </AccountsSummaryContainer>
      )
    }
  }

  const renderInputAccounts = () => {
    if (!t.inputs) return
    const inputs = _(t.inputs.filter((o) => o.address !== addressId))
      .map((v) => v.address)
      .uniq()
      .value()

    return inputs.length > 0 ? (
      <AccountsSummaryContainer>
        <AddressLink address={inputs[0]} maxWidth="250px" />
        {inputs.length > 1 && ` (+ ${inputs.length - 1})`}
      </AccountsSummaryContainer>
    ) : (
      <BlockRewardLabel>Block rewards</BlockRewardLabel>
    )
  }

  const directionIconSize = 18

  return (
    <>
      <TableRow key={t.hash} isActive={detailOpen} onClick={toggleDetail}>
        <td>
          {isOut ? (
            <ArrowUpCircle size={directionIconSize} />
          ) : (
            <ArrowDownCircle size={directionIconSize} color={theme.valid} />
          )}
        </td>
        <td>
          <TightLink to={`/transactions/${t.hash}`} text={t.hash} maxWidth="120px" />
        </td>
        <td>{(t.timestamp && <Timestamp timeInMs={t.timestamp} />) || '-'}</td>
        <td>
          <Badge type="neutral" content={isOut ? 'To' : 'From'} floatRight minWidth={60} />
        </td>
        <td>{isOut ? renderOutputAccounts() : renderInputAccounts()}</td>
        <td>
          <AmountDelta value={amountDelta} />
        </td>
        <DetailToggle isOpen={detailOpen} onClick={toggleDetail} />
      </TableRow>
      <TableDetailsRow openCondition={detailOpen}>
        <AnimatedCell colSpan={7}>
          <Table>
            <TableHeader headerTitles={['Inputs', '', 'Outputs']} columnWidths={['', '50px', '']} />
            <TableBody>
              <TableRow>
                <td>
                  {t.inputs && t.inputs.length > 0 ? (
                    t.inputs.map((input, i) => (
                      <AddressLink
                        key={i}
                        address={input.address}
                        txHashRef={input.txHashRef}
                        amount={BigInt(input.amount)}
                        maxWidth="180px"
                      />
                    ))
                  ) : (
                    <BlockRewardLabel>Block rewards</BlockRewardLabel>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <ArrowRight size={12} />
                </td>
                <td>
                  {t.outputs &&
                    t.outputs.map((output, i) => (
                      <AddressLink
                        key={i}
                        address={output.address}
                        amount={BigInt(output.amount)}
                        maxWidth="180px"
                        lockTime={output.lockTime}
                      />
                    ))}
                </td>
              </TableRow>
            </TableBody>
          </Table>
        </AnimatedCell>
      </TableDetailsRow>
    </>
  )
}

const AddressTableBodyCustomStyles: TDStyle[] = [
  {
    tdPos: 2,
    style: css`
      font-weight: 600;
    `
  }
]

const TxListCustomStyles: TDStyle[] = [
  {
    tdPos: 6,
    style: css`
      text-align: right;
    `
  }
]

const AccountsSummaryContainer = styled.div`
  display: flex;
  align-items: center;
`

const BlockRewardLabel = styled.span`
  color: ${({ theme }) => theme.textSecondary};
  font-style: italic;
`

const NoTxMessage = styled.td`
  color: ${({ theme }) => theme.textSecondary};
  padding: 20px;
`

const ErrorMessage = styled.span`
  color: ${({ theme }) => theme.textSecondary};
  font-style: italic;
  font-weight: 400;
`

export default TransactionInfoPage
